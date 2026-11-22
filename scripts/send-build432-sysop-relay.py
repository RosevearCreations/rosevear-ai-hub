"""AIDP Build 432 one-shot original-host signed telemetry relay.

Run only on DESKTOP-AE894KC after signer provisioning and source-commit enrollment.
It obtains a one-time AIDP challenge, signs it locally, posts one aggregate envelope,
prints the receiver's non-secret receipt, and exits. It installs no service or schedule.
"""
from __future__ import annotations
import json,os,platform,sys,time,urllib.request
from rosevear_ai_hub.api.sysop_telemetry423 import build_sysop_telemetry423
from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST

BASE=os.environ.get("ROSEVEAR_AIDP_BUILD432_ORIGIN","https://ai-data-platform-beryl.vercel.app").rstrip("/")
CHALLENGE=BASE+"/internal/rosevear/sysop/build432/challenge/rosevear-ai-hub"
INTAKE=BASE+"/internal/rosevear/sysop/build432/intake"

def request_json(url:str,*,method:str="GET",body:dict|None=None)->dict:
 data=None if body is None else json.dumps(body,separators=(",",":")).encode()
 req=urllib.request.Request(url,data=data,method=method,headers={"Accept":"application/json","Content-Type":"application/json","User-Agent":"Rosevear-AI-Hub-Build432/1"})
 with urllib.request.urlopen(req,timeout=10) as response:
  if response.status!=200:raise RuntimeError(f"AIDP_HTTP_{response.status}")
  return json.loads(response.read(20000))

def main()->int:
 if os.name!="nt" or platform.node().upper()!=ORIGINAL_HOST:
  print("HOLD_BUILD432_NOT_ORIGINAL_WINDOWS_HOST");return 2
 challenge=request_json(CHALLENGE).get("challenge","")
 envelope=build_sysop_telemetry423(now_ms=int(time.time()*1000),machine_name=platform.node(),windows_host=True,challenge=challenge)
 receipt=request_json(INTAKE,method="POST",body=envelope)
 print(json.dumps({"state":receipt.get("state"),"receiptId":receipt.get("receiptId"),"sourceCommit":envelope["payload"]["sourceCommit"]},separators=(",",":")))
 return 0 if receipt.get("state")=="ACTIVE_V12_SIGNED" else 3
if __name__=="__main__":sys.exit(main())
