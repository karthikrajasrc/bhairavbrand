import { apiRequest } from '../context/AuthContext.jsx';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const result = await apiRequest('/api/admin/images', { method: 'POST', body: formData });
  return result.imageUrl;
}
