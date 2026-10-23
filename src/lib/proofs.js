import imageCompression from 'browser-image-compression'
import { supabase } from './supabase.js'

// Shrink a proof photo, upload it to the private "proofs" bucket, then ask
// the server to mark the square. Returns the updated player row
// (finished_at is set if this mark completed a line).
export async function uploadProof({ gameId, playerId, cellIndex, photo }) {
  const file = new File([photo], 'proof.jpg', { type: 'image/jpeg' })
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 1280,
    fileType: 'image/jpeg',
    // The web worker would download its script from a CDN, which can fail
    // on busy event Wi-Fi. Compressing on the main thread is fast enough.
    useWebWorker: false,
  })

  const path = `${gameId}/${playerId}/${cellIndex}-${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('proofs')
    .upload(path, compressed, { contentType: 'image/jpeg' })
  if (uploadError) throw uploadError

  const { data, error } = await supabase.rpc('mark_square', {
    p_player_id: playerId,
    p_cell_index: cellIndex,
    p_photo_path: path,
  })
  if (error) throw error
  return data
}
