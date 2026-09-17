/** Removed product features cannot be restored by an old browser or config. */
export function removedFeatureRequest(endpoint, payload = {}) {
  return endpoint.startsWith('gateway') || endpoint.includes('CustomTunnel')
    || (endpoint === 'setTunnelAutoStart' && ['custom', 'customTunnel'].includes(payload?.tunnel))
    || (endpoint.startsWith('platform') && [payload?.platform, payload?.platformId].includes('feishu'));
}
