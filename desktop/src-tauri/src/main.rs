// TIMELINER for Windows: the web build (../../dist) in a window using Windows' own Edge engine (WebView2).
// The on-device database lives in %LOCALAPPDATA%\com.triedindie.timeliner and stays between launches.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        // The database can be open in one window only: a second launch focuses the first.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .run(tauri::generate_context!())
        .expect("error while running TIMELINER");
}
