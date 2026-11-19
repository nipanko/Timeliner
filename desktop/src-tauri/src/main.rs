// TIMELINER for Windows: the web build (../../dist) in a window using Windows' own Edge engine (WebView2).
// Everything (the database with tasks, board and pictures) lives in one data folder the user can choose
// in Settings; by default `data` next to the app. The choice is kept in %APPDATA%\com.triedindie.timeliner.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::Engine;
use serde_json::{json, Value};
use std::{fs, io::Read, path::{Path, PathBuf}};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

fn config_file(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().expect("config dir").join("location.json")
}

fn default_dir() -> PathBuf {
    std::env::current_exe().ok().and_then(|p| p.parent().map(|d| d.join("data"))).unwrap_or_else(|| PathBuf::from("data"))
}

fn read_config(app: &AppHandle) -> Value {
    fs::read_to_string(config_file(app)).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Null)
}

fn write_config(app: &AppHandle, v: &Value) -> Result<(), String> {
    let f = config_file(app);
    fs::create_dir_all(f.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(f, v.to_string()).map_err(|e| e.to_string())
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() { copy_dir(&entry.path(), &target)? } else { fs::copy(entry.path(), target)?; }
    }
    Ok(())
}

/// Where the data lives now; moves it first if the user picked a new folder (done before the window opens,
/// because the browser engine locks its files while running).
fn data_dir(app: &AppHandle) -> PathBuf {
    let mut cfg = read_config(app);
    let dir = cfg["dir"].as_str().map(PathBuf::from).filter(|d| d.is_absolute()).unwrap_or_else(default_dir);
    let from = cfg["move_from"].as_str().map(PathBuf::from).or_else(|| {
        // First launch of this version: bring along data from the old fixed location.
        let old = app.path().app_local_data_dir().ok()?;
        (cfg.is_null() && old.join("EBWebView").exists()).then_some(old)
    });
    if let Some(from) = from {
        if from != dir && !dir.join("EBWebView").exists() {
            let _ = copy_dir(&from.join("EBWebView"), &dir.join("EBWebView"));
        }
    }
    cfg = json!({ "dir": dir.to_string_lossy() });
    let _ = write_config(app, &cfg);
    dir
}

#[tauri::command]
fn get_data_dir(app: AppHandle) -> String {
    read_config(&app)["dir"].as_str().map(String::from).unwrap_or_else(|| default_dir().to_string_lossy().into())
}

/// Switch to another folder, copying the data there on the next start, then restart.
#[tauri::command]
fn set_data_dir(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).is_absolute() {
        return Err("Pick a full folder path".into());
    }
    let current = get_data_dir(app.clone());
    write_config(&app, &json!({ "dir": path, "move_from": current }))?;
    app.restart();
}

/// Downloads a picture from the web for the Board (the app's own page can't, because of browser rules).
#[tauri::command]
async fn fetch_image(url: String) -> Result<String, String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only web addresses can be downloaded".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let res = ureq::get(&url).call().map_err(|e| e.to_string())?;
        let kind = res.content_type().to_string();
        if !kind.starts_with("image/") {
            return Err("That link is not a picture".into());
        }
        let mut bytes = Vec::new();
        res.into_reader().take(25 * 1024 * 1024).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        Ok(format!("data:{};base64,{}", kind, base64::engine::general_purpose::STANDARD.encode(bytes)))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        // The database can be open in one window only: a second launch focuses the first.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_data_dir, set_data_dir, fetch_image])
        .setup(|app| {
            let dir = data_dir(app.handle());
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("TIMELINER")
                .inner_size(1280.0, 860.0)
                .min_inner_size(380.0, 600.0)
                .data_directory(dir)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running TIMELINER");
}
