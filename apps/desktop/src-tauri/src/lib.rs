use std::process::Child;
use std::sync::{Mutex, OnceLock};

#[cfg(windows)]
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::process::{Command, Stdio};

static BACKEND_RESTART: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
const BACKEND_CONFIRMATION: &str = "RESTART HUB BACKEND";
const CLIENT_CONFIRMATION: &str = "RESTART HUB CLIENT";

fn validate_confirmation(actual: &str, expected: &str) -> Result<(), String> {
    if actual == expected {
        Ok(())
    } else {
        Err("Type the exact restart confirmation to continue.".to_owned())
    }
}

#[cfg(windows)]
fn valid_repo_root(path: &Path) -> Option<PathBuf> {
    let root = path.canonicalize().ok()?;
    if !root.join("README.md").is_file() || !root.join("package.json").is_file() {
        return None;
    }
    let scripts = root.join("scripts");
    if scripts.symlink_metadata().ok()?.file_type().is_symlink() {
        return None;
    }
    for filename in ["restart-hub-backend.ps1", "hub-backend-identity.ps1"] {
        let file = scripts.join(filename);
        let kind = file.symlink_metadata().ok()?.file_type();
        if kind.is_symlink() || !kind.is_file() {
            return None;
        }
    }
    Some(root)
}

#[cfg(windows)]
fn hub_repo_root() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(value) = std::env::var_os("ROSEVEAR_AI_HUB_ROOT") {
        candidates.push(PathBuf::from(value));
    }
    if let Ok(current) = std::env::current_dir() {
        candidates.extend(current.ancestors().map(Path::to_path_buf));
    }
    if let Ok(exe) = std::env::current_exe() {
        candidates.extend(exe.ancestors().map(Path::to_path_buf));
    }
    candidates.into_iter().find_map(|path| valid_repo_root(&path))
}

/// Starts ONLY the repository's existing owner-verified Windows backend restart
/// script. The child process is tracked, and never run through a shell string.
#[tauri::command]
fn restart_hub_backend(confirmation: String) -> Result<String, String> {
    validate_confirmation(&confirmation, BACKEND_CONFIRMATION)?;
    #[cfg(not(windows))]
    {
        return Err("Local backend restart is available on Windows only.".to_owned());
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let repo = hub_repo_root().ok_or(
            "Hub repository not located; configure ROSEVEAR_AI_HUB_ROOT on this Windows PC."
                .to_owned(),
        )?;
        let store = BACKEND_RESTART.get_or_init(|| Mutex::new(None));
        let mut running = store.lock().map_err(|_| "Restart state unavailable.")?;
        if let Some(child) = running.as_mut() {
            if child.try_wait().map_err(|_| "Restart state unavailable.")?.is_none() {
                return Err("A backend restart is already in progress.".to_owned());
            }
        }
        let script = repo.join("scripts").join("restart-hub-backend.ps1");
        let child = Command::new("powershell.exe")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-ExecutionPolicy")
            .arg("Bypass")
            .arg("-File")
            .arg(script)
            .arg("-Action")
            .arg("Restart")
            .arg("-RepoRoot")
            .arg(&repo)
            .current_dir(&repo)
            .creation_flags(0x08000000)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|_| "Could not start the guarded Windows maintenance script.")?;
        *running = Some(child);
        Ok("started".to_owned())
    }
}

#[tauri::command]
fn hub_backend_restart_state() -> Result<String, String> {
    #[cfg(not(windows))]
    {
        return Ok("unsupported".to_owned());
    }
    #[cfg(windows)]
    {
        let store = BACKEND_RESTART.get_or_init(|| Mutex::new(None));
        let mut guard = store.lock().map_err(|_| "Restart state unavailable.")?;
        match guard.as_mut() {
            None => Ok("idle".to_owned()),
            Some(child) => match child.try_wait() {
                Ok(None) => Ok("running".to_owned()),
                Ok(Some(status)) => {
                    let result = if status.success() { "completed" } else { "failed" };
                    *guard = None;
                    Ok(result.to_owned())
                }
                Err(_) => {
                    *guard = None;
                    Ok("failed".to_owned())
                }
            },
        }
    }
}

#[tauri::command]
fn restart_hub_client(app: tauri::AppHandle, confirmation: String) -> Result<(), String> {
    validate_confirmation(&confirmation, CLIENT_CONFIRMATION)?;
    app.request_restart();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restart_is_opt_in_and_exact() {
        assert!(validate_confirmation("RESTART HUB BACKEND", BACKEND_CONFIRMATION).is_ok());
        assert!(validate_confirmation("restart hub backend", BACKEND_CONFIRMATION).is_err());
        assert!(validate_confirmation("RESTART HUB CLIENT", BACKEND_CONFIRMATION).is_err());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            restart_hub_backend,
            hub_backend_restart_state,
            restart_hub_client
        ])
        .run(tauri::generate_context!())
        .expect("error while running Rosevear AI Hub");
}
