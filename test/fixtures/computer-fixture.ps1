Add-Type -AssemblyName System.Windows.Forms
$form = New-Object Windows.Forms.Form
$form.Text = 'DARASK Computer Use Test'
$form.Width = 480; $form.Height = 240
$inputBox = New-Object Windows.Forms.TextBox
$inputBox.AccessibleName = 'Test input'; $inputBox.SetBounds(20,20,400,30)
$label = New-Object Windows.Forms.Label
$label.Text = 'Awaiting action'; $label.SetBounds(20,120,400,40)
$button = New-Object Windows.Forms.Button
$button.Text = 'Apply test'; $button.SetBounds(20,65,150,35)
$button.Add_Click({$label.Text = 'Verified: ' + $inputBox.Text})
$password = New-Object Windows.Forms.TextBox
$password.AccessibleName = 'Private'; $password.UseSystemPasswordChar = $true
$password.Text = 'fixture-private-value'; $password.SetBounds(190,65,200,30)
$form.Controls.AddRange(@($inputBox,$button,$label,$password))
$form.ShowInTaskbar = $false
[Windows.Forms.Application]::Run($form)
