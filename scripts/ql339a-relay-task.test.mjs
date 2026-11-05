import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {disabledTaskXml,verifyTaskOwnership,manageTask,TASK_NAME} from './ql339a-relay-task.mjs';

const spec={nodePath:'C:\\Program Files\\nodejs\\node.exe',
  scriptPath:'C:\\Users\\ree\\rosevearaihub\\scripts\\ql339a-relay-agent.mjs',
  workingDirectory:'C:\\Users\\ree\\rosevearaihub',account:'ROSEVEAR-PC\\ree'};
const xml=disabledTaskXml(spec);

test('Windows task XML is disabled, interactive least-privilege and cannot bypass script policy',()=>{
  assert.match(xml,/<Enabled>false<\/Enabled>/);
  assert.match(xml,/<LogonType>InteractiveToken<\/LogonType>/);
  assert.match(xml,/<RunLevel>LeastPrivilege<\/RunLevel>/);
  assert.match(xml,/<LogonTrigger>/);
  assert.match(xml,/--scheduled-hold/);
  assert.equal(verifyTaskOwnership(xml,spec),true);
  assert.equal(verifyTaskOwnership(xml.replaceAll('&quot;','"'),spec),true);
  assert.equal(verifyTaskOwnership(xml.replace('<Enabled>false','<Enabled>true'),spec),false);
  assert.equal(verifyTaskOwnership(xml.replace('ql339a-relay-agent.mjs','other.mjs'),spec),false);
  assert.equal(verifyTaskOwnership(xml.replaceAll('ROSEVEAR-PC\\ree','OTHER-PC\\ree'),spec),false);
  assert.equal(verifyTaskOwnership(xml.replace('</Exec>','</Exec><Exec><Command>other.exe</Command></Exec>'),spec),false);
  assert.doesNotMatch(xml,/ExecutionPolicy|Bypass|HighestAvailable|\.ps1|Tailscale|funnel/i);
  assert.throws(()=>disabledTaskXml({...spec,nodePath:'powershell.exe'}),/DENY_TASK/);
  assert.throws(()=>disabledTaskXml({...spec,scriptPath:'C:\\Other\\x.ps1'}),/DENY_TASK/);
});

test('the exact scheduled task is never enabled and install requires absence',()=>{
  const calls=[];let installed=false;
  const run=(file,args)=>{
    calls.push({file,args});
    if(args[0]==='/Query')return installed?{status:0,stdout:xml}:{status:1};
    if(args[0]==='/Create'){
      assert.equal(args.includes('/F'),false);
      assert.equal(existsSync(args[args.indexOf('/XML')+1]),true);
      installed=true;return {status:0};
    }
    if(args[0]==='/Delete'){installed=false;return {status:0};}
    throw new Error('unexpected scheduler invocation');
  };
  const specFactory=()=>spec;
  assert.equal(manageTask('--status',{platform:'win32',run,specFactory}).status,
    'NOT_INSTALLED_OR_UNREADABLE');
  assert.equal(manageTask('--install',{platform:'win32',run,specFactory}).status,
    'INSTALLED_DISABLED_TEST_HOLD');
  assert.equal(manageTask('--install',{platform:'win32',run,specFactory}).status,
    'HOLD_TASK_NAME_ALREADY_REGISTERED');
  assert.equal(manageTask('--status',{platform:'win32',run,specFactory}).status,
    'DISABLED_KNOWN_TASK');
  assert.equal(manageTask('--enable',{platform:'win32',run,specFactory}).status,
    'DENY_ACTIVATION_NOT_AUTHORIZED');
  assert.equal(manageTask('--remove',{platform:'win32',run,specFactory}).status,
    'REMOVED_KNOWN_DISABLED_TASK');
  assert.equal(installed,false);
  assert.ok(calls.every(call=>call.file==='schtasks.exe'&&call.args.includes(TASK_NAME)));
  assert.equal(calls.filter(call=>call.args[0]==='/Create').length,1);
  assert.equal(calls.filter(call=>call.args[0]==='/Delete').length,1);
});

test('unrecognized, active or differently sourced tasks are never removed',()=>{
  const calls=[];
  const run=(file,args)=>{calls.push(args);return {status:0,stdout:xml.replace('<Enabled>false','<Enabled>true')};};
  assert.equal(manageTask('--remove',{platform:'win32',run,specFactory:()=>spec}).status,
    'DENY_REMOVE_UNKNOWN_OR_ENABLED_TASK');
  assert.equal(calls.length,1);assert.equal(calls[0][0],'/Query');
});

test('non-Windows and unapproved CLI do not touch Task Scheduler',()=>{
  assert.equal(manageTask('--install',{platform:'linux'}).status,'HOLD_WINDOWS_OWNER_DEVICE_REQUIRED');
  const file=fileURLToPath(new URL('./ql339a-relay-task.mjs',import.meta.url));
  const denied=spawnSync(process.execPath,[file,'--install'],{encoding:'utf8'});
  assert.equal(denied.status,1);
  assert.equal(JSON.parse(denied.stdout).status,'DENY_OWNER_APPROVAL_OR_ACTION');
  const plan=spawnSync(process.execPath,[file,'--plan'],{encoding:'utf8'});
  assert.equal(plan.status,0);
  assert.equal(JSON.parse(plan.stdout).taskEnabled,false);
});
