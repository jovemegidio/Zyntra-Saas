// Zyntra ERP Desktop — Entry Point
// Prevents console window from showing on Windows release builds

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    zyntra_erp_lib::run();
}
