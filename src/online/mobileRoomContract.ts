// Production Show Your Hand currently supports exactly two seats per safe room.
// This adapter deliberately keeps the RPC request shape limited to the
// deployed syh_create_safe_room(uuid,text) signature. Six-player support must
// be enabled only after the corresponding database and game-server rollout.
export function createSafeRoomParams(safetyInstallId: string, displayName: string) {
  return {
    p_safety_install_id: safetyInstallId,
    p_display_name: displayName,
  }
}
