import assert from 'node:assert/strict';
import test from 'node:test';
import { BlockAssembler, createToolResultMessage } from '@deepseek-ai/dsh-llm';
import { decodeResponsesEvents } from '../vendor/dsh-grok-provider/src/internal/responses-codec.mjs';
import { createResponsesRequestCompiler } from '../vendor/dsh-grok-provider/src/internal/responses-request-compiler.mjs';

// Synthetic protocol fixtures: never copy real encrypted reasoning or credentials.
function toolEvents() {
  return [
    { type: 'response.created', response: { id: 'response_fixture', status: 'in_progress' } },
    { type: 'response.in_progress', response: { id: 'response_fixture', status: 'in_progress' } },
    { type: 'response.output_item.added', output_index: 0, item: { id: 'reason_fixture', type: 'reasoning', status: 'in_progress', summary: [] } },
    { type: 'response.output_item.done', output_index: 0, item: { id: 'reason_fixture', type: 'reasoning', status: 'completed', summary: [], encrypted_content: 'synthetic-sealed-reasoning' } },
    { type: 'response.output_item.added', output_index: 1, item: { id: 'function_fixture', type: 'function_call', status: 'in_progress', call_id: 'call_fixture', name: 'read', arguments: '' } },
    { type: 'response.function_call_arguments.delta', output_index: 1, item_id: 'function_fixture', delta: '{"file_path":"fixture.txt"}' },
    { type: 'response.function_call_arguments.done', output_index: 1, item_id: 'function_fixture', name: 'read', arguments: '{"file_path":"fixture.txt"}' },
    { type: 'response.output_item.done', output_index: 1, item: { id: 'function_fixture', type: 'function_call', status: 'completed', call_id: 'call_fixture', name: 'read', arguments: '{"file_path":"fixture.txt"}' } },
    { type: 'response.completed', response: { id: 'response_fixture', status: 'completed', usage: { input_tokens: 20, output_tokens: 10 } } },
  ].map((event, sequence_number) => ({ ...event, sequence_number }));
}
const route = { backend: 'responses', resolvedModelInfo: { id: 'grok-4.6', provider: 'grok' } };
async function compile(messages) {
  return (await createResponsesRequestCompiler().compile({ provider: 'grok', model: 'grok-4.6', messages }, route)).request;
}

test('encrypted-only reasoning survives real DSH assembly and the next tool-result request', async () => {
  const assembler = new BlockAssembler();
  for (const chunk of decodeResponsesEvents(toolEvents(), { functionNames: ['read'], serverTools: [] })) assembler.push(chunk);
  const assistant = assembler.message({ kind: 'model', provider: 'grok', model: 'grok-4.6', replayState: assembler.replayState });
  assert.equal(assembler.finish.kind, 'tool-calls');
  assert.deepEqual(assistant.content.map(b => b.type), ['reasoning', 'tool-call']);
  assert.equal(assistant.content[0].text, '', 'do not fabricate or display encrypted reasoning as text');
  assert.equal(assistant.source.replayState.blocks[0].encryptedContent, 'synthetic-sealed-reasoning');
  const result = createToolResultMessage({ callId: 'call_fixture', content: [{ type: 'text', text: 'caption fixture data' }], isError: false });
  const request = await compile([assistant, result]);
  assert.deepEqual(request.input.map(i => i.type), ['reasoning', 'function_call', 'function_call_output']);
  assert.equal(request.input[0].encrypted_content, 'synthetic-sealed-reasoning');
  assert.equal(request.input[1].call_id, request.input[2].call_id);
  assert.equal(request.input[2].output, 'caption fixture data');
});

test('native transparent WebP tool result is projected to PNG without losing call identity or alpha', async t => {
  const {Context}=await import('@deepseek-ai/cordis');
  const {LocalAttachmentStore}=await import('@deepseek-ai/dsh-attachment-local');
  const {default:sharp}=await import('sharp');
  const {mkdtemp,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const home=await mkdtemp(join(tmpdir(),'grok-image-'));const ctx=new Context();
  t.after(async()=>{await rm(home,{recursive:true,force:true});});
  const store=new LocalAttachmentStore(ctx,{dshHome:home});
  const data=await sharp({create:{width:32,height:24,channels:4,background:{r:255,g:0,b:0,alpha:0.5}}}).webp().toBuffer();
  const attachment=await store.saveImage({data,mediaType:'image/webp',name:'fixture.png'});
  assert.equal(attachment.mediaType,'image/webp','reproduce the stored WebP attachment returned by read_image');
  const assistant={role:'assistant',source:{kind:'model',provider:'grok',model:'grok-4.6'},content:[{type:'tool-call',id:'read-image',name:'read_image',arguments:'{}'}]};
  const result=createToolResultMessage({callId:'read-image',isError:false,content:[{type:'text',text:'Image read'},{type:'image',attachment}]});
  const imageRoute={...route,resolvedModelInfo:{...route.resolvedModelInfo,inputModalities:['text','image']},imageInput:{readPolicy:{maxBytes:4194304,maxPixels:16777216},maxDimension:8192,maxImages:8,maxTotalBytes:8388608,mediaTypes:['image/jpeg','image/png']}};
  const compiler=createResponsesRequestCompiler({getAttachmentStore:()=>store});
  const request=(await compiler.compile({provider:'grok',model:'grok-4.6',messages:[assistant,result]},imageRoute)).request;
  const output=request.input.at(-1); assert.equal(output.type,'function_call_output');assert.equal(output.call_id,request.input[0].call_id);
  assert.equal(output.output[0].text,'Image read'); const encoded=output.output[1].image_url;
  assert.ok(encoded.startsWith('data:image/png;base64,'));
  const meta=await sharp(Buffer.from(encoded.split(',')[1],'base64')).metadata();assert.equal(meta.hasAlpha,true);assert.equal(meta.width,32);
  assert.equal(result.content[0].content[1].attachment.mediaType,'image/webp','durable history remains unchanged');
});
