import * as FileSystem from 'expo-file-system/legacy'
import { api } from './api'
import type {
  ApiResponse,
  MediaConfirmResponse,
  MediaType,
  PresignRequest,
  PresignResponse,
} from '../types'

// `expo-file-system/legacy` keeps the streaming `uploadAsync` API. The new file-
// based API in expo-file-system v19 doesn't expose a streaming uploader yet,
// and reading the whole file into memory is fine for thumbnails but bad for
// large videos / documents in Phase 3.

export interface FilePicked {
  uri: string
  fileName: string
  mimeType: string
  fileSize: number
}

export async function uploadFile(
  file: FilePicked,
  mediaType: MediaType,
): Promise<MediaConfirmResponse> {
  const presignBody: PresignRequest = {
    fileName: file.fileName,
    mimeType: file.mimeType,
    mediaType,
    fileSize: file.fileSize,
  }
  const presign = await api<ApiResponse<PresignResponse>>('/media/presign', {
    method: 'POST',
    body: JSON.stringify(presignBody),
  })

  const result = await FileSystem.uploadAsync(presign.data.uploadUrl, file.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': file.mimeType },
  })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status})`)
  }

  const confirm = await api<ApiResponse<MediaConfirmResponse>>('/media/confirm', {
    method: 'POST',
    body: JSON.stringify({ key: presign.data.key }),
  })
  return confirm.data
}
