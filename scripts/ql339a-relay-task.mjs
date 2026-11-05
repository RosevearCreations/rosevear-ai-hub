/** QL-339A: Windows Task Scheduler owner-supervised, DISABLED test relay registration. */
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir,userInfo} from 'node:os';
import {dirname,join,resolve,isAbsolute,basename,win32} from 'node:path';
import {fileURLToPath} from 'node:url';

export const TASK_NAME='Rosevear Comms Relay - TEST HOLD';
const scriptsDir=dirname(fileURLToPath(import.meta.url));
const agentPath=join(scriptsDir,'ql339a-relay-agent.mjs');
const root=resolve(scriptsDir,'..');
const xmlEscape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&apos;');
const pathSafe=value=>typeof value==='string'&&(isAbsolute(value)||win32.isAbsolute(value))&&value.length<255&&
  !/[\r\n"<>|]/.test(value);
const state=(status,details={})=>Object.freeze({schema:'rosevear.hub.ql339a.task.v1',status,
  taskName:TASK_NAME,taskEnabled:false,relayActive:false,privatePeerConnected:false,
  communicationsSent:0,...details});

/** Task remains disabled even if imported successfully. No startup action without later approval. */
export function disabledTaskXml({nodePath,scriptPath,workingDirectory,account}){
  if(![nodePath,scriptPath,workingDirectory].every(pathSafe)||
    basename(nodePath.replaceAll('\\','/')).toLowerCase()!=='node.exe'||
    basename(scriptPath.replaceAll('\\','/'))!=='ql339a-relay-agent.mjs'||
    typeof account!=='string'||!/^[-\w .]{1,64}\\[-\w .]{1,64}$/.test(account))
    throw new Error('DENY_TASK_IDENTITY_OR_PATH');
  const user=xmlEscape(account),node=xmlEscape(nodePath),script=xmlEscape(scriptPath);
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>QL-339A TEST HOLD only. No live connection or Windows service. Owner activation is separate.</Description></RegistrationInfo>
  <Triggers><LogonTrigger><Enabled>true</Enabled><UserId>${user}</UserId></LogonTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>${user}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable>
    <Enabled>false</Enabled><Hidden>false</Hidden><ExecutionTimeLimit>PT0S</ExecutionTimeLimit></Settings>
  <Actions Context="Author"><Exec><Command>${node}</Command><Arguments>&quot;${script}&quot; --scheduled-hold</Arguments>
    <WorkingDirectory>${xmlEscape(workingDirectory)}</WorkingDirectory></Exec></Actions>
</Task>`;
}

export function verifyTaskOwnership(exportedXml,spec){
  if(typeof exportedXml!=='string'||!spec)return false;
  const normalized=exportedXml.replace(/^\ufeff/,'').toLowerCase();
  const values=tag=>[...normalized.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,'gi'))]
    .map(match=>match[1].trim().replaceAll('&quot;','"').replaceAll('&apos;',"'")
      .replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
  const same=(actual,expected)=>actual.length===1&&actual[0]===expected.toLowerCase();
  return values('Enabled').length===2&&values('Enabled')[0]==='true'&&
    values('Enabled')[1]==='false'&&
    same(values('Command'),spec.nodePath)&&
    same(values('Arguments'),`"${spec.scriptPath}" --scheduled-hold`)&&
    same(values('WorkingDirectory'),spec.workingDirectory)&&
    same(values('RunLevel'),'LeastPrivilege')&&
    same(values('LogonType'),'InteractiveToken')&&
    values('UserId').length===2&&values('UserId').every(value=>value===spec.account.toLowerCase())&&
    (normalized.match(/<exec\b/g)??[]).length===1;
}

export function taskSpec({platform=process.platform,nodePath=process.execPath,
  scriptPath=agentPath,workingDirectory=root,account}={}){
  if(platform!=='win32')throw new Error('WINDOWS_OWNER_DEVICE_REQUIRED');
  if(!account){
    const domain=process.env.USERDOMAIN;
    if(!domain)throw new Error('WINDOWS_ACCOUNT_NOT_ATTESTED');
    account=`${domain}\\${userInfo().username}`;
  }
  if(!existsSync(scriptPath))throw new Error('RELAY_AGENT_MISSING');
  return {nodePath,scriptPath,workingDirectory,account,
    xml:disabledTaskXml({nodePath,scriptPath,workingDirectory,account})};
}

function queryTask(run){
  const q=run('schtasks.exe',['/Query','/TN',TASK_NAME,'/XML'],
    {encoding:'utf8',windowsHide:true,timeout:15_000});
  return q.status===0?String(q.stdout??''):null;
}

/** Never activate a task or bypass PowerShell policy; owner must invoke installation locally. */
export function manageTask(mode,{platform=process.platform,run=spawnSync,
  specFactory=taskSpec}={}){
  if(platform!=='win32')return state('HOLD_WINDOWS_OWNER_DEVICE_REQUIRED');
  if(mode==='--enable'||mode==='--start')return state('DENY_ACTIVATION_NOT_AUTHORIZED');
  let spec;
  try{spec=specFactory({platform});}catch{return state('HOLD_OWNER_SOURCE_OR_NODE_IDENTITY');}
  const existing=queryTask(run);
  if(mode==='--status')return state(existing===null?'NOT_INSTALLED_OR_UNREADABLE':
    verifyTaskOwnership(existing,spec)?'DISABLED_KNOWN_TASK':'HOLD_UNRECOGNIZED_OR_ENABLED_TASK');
  if(mode==='--install'){
    if(existing!==null)return state('HOLD_TASK_NAME_ALREADY_REGISTERED');
    const directory=mkdtempSync(join(tmpdir(),'rosevear-ql339a-task-'));
    try{
      const xmlFile=join(directory,'disabled-test-hold.xml');
      writeFileSync(xmlFile,Buffer.from('\ufeff'+spec.xml,'utf16le'));
      const created=run('schtasks.exe',['/Create','/TN',TASK_NAME,'/XML',xmlFile],
        {encoding:'utf8',windowsHide:true,timeout:15_000});
      if(created.status!==0)return state('HOLD_WINDOWS_TASK_REGISTRATION_FAILED');
      const installed=queryTask(run);
      return state(installed&&verifyTaskOwnership(installed,spec)?
        'INSTALLED_DISABLED_TEST_HOLD':'HOLD_POST_INSTALL_OWNER_REVIEW_REQUIRED');
    }finally{rmSync(directory,{recursive:true,force:true});}
  }
  if(mode==='--remove'){
    if(existing===null)return state('NOT_INSTALLED_OR_UNREADABLE');
    if(!verifyTaskOwnership(existing,spec))return state('DENY_REMOVE_UNKNOWN_OR_ENABLED_TASK');
    const removed=run('schtasks.exe',['/Delete','/TN',TASK_NAME,'/F'],
      {encoding:'utf8',windowsHide:true,timeout:15_000});
    return state(removed.status===0?'REMOVED_KNOWN_DISABLED_TASK':
      'HOLD_WINDOWS_TASK_REMOVAL_FAILED');
  }
  return state('DENY_UNKNOWN_ACTION');
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const action=process.argv[2]??'--plan';
  let result;
  if(action==='--help'){
    process.stdout.write('QL-339A: --plan, --status, --install --owner-confirmed-test-hold, --remove --owner-confirmed-remove. No enable/start.\n');
  }else if(action==='--plan'){
    result=state('OWNER_SUPERVISED_INSTALL_AVAILABLE_BUT_NOT_RUN',{
      installationMode:'WINDOWS_DISABLED_INTERACTIVE_TASK',
      powershellScriptPolicyChanged:false,requiresOwnerInstallation:true});
  }else if(action==='--status')result=manageTask('--status');
  else if(action==='--install'&&process.argv[3]==='--owner-confirmed-test-hold')
    result=manageTask('--install');
  else if(action==='--remove'&&process.argv[3]==='--owner-confirmed-remove')
    result=manageTask('--remove');
  else result=state('DENY_OWNER_APPROVAL_OR_ACTION');
  if(result){process.stdout.write(JSON.stringify(result)+'\n');
    if(result.status.startsWith('DENY_')||result.status.startsWith('HOLD_'))process.exitCode=1;}
}
