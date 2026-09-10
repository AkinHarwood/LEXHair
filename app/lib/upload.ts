import { Platform } from "react-native";
import { API_URL } from "./api";

export type PickedAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  file?: File; // present on web
};

export type UploadedAttachment = {
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
};

export async function uploadFile(asset: PickedAsset, token: string): Promise<UploadedAttachment> {
  const form = new FormData();

  if (Platform.OS === "web" && asset.file) {
    form.append("file", asset.file, asset.name);
  } else {
    // React Native's FormData accepts this {uri, name, type} shape directly.
    form.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || "application/octet-stream",
    } as any);
  }

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  return res.json();
}
