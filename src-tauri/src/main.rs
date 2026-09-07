#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn analyze_url(url: String) -> Result<String, String> {
    // Skeleton function to be expanded in Phase 3
    // In Rust, you would use reqwest to fetch headers/content-length, 
    // and integrate a Rust-based youtube extractor like `rusty_ytdl` or call out to yt-dlp binary.
    Ok(format!("Tauri received URL to analyze: {}", url))
}

#[tauri::command]
async fn start_download(url: String, filename: String) -> Result<String, String> {
    // Skeleton function for Rust multi-threaded chunk downloading
    Ok(format!("Download started for {}", filename))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![analyze_url, start_download])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
