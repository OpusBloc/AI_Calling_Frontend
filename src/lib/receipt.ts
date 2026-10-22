import axios from 'axios';

export interface ReceiptPayload {
  company_name: string;
  serial_no: string;
  date_str: string;
  from_name: string;
  from_wallet: string;
  to_name: string;
  to_wallet: string;
  tx_hash: string;
  block_no: string;
  category: string;
  method: string;
  amount_inr: string;
  status: string;
  purpose: string;
  reference: string;
  remarks: string;
  tx_url: string;
}

export async function postReceipt(payload: ReceiptPayload): Promise<string | null> {
  try {
    // Request as blob to support direct PDF responses
    const res = await axios.post('https://opus-black.docuguide.ai/api/receipt', payload, {
      headers: { 'Content-Type': 'application/json' },
      responseType: 'blob'
    });
    const contentType = res.headers['content-type'] || '';
    const blob = res.data as Blob;
    if (contentType.startsWith('application/pdf') || blob.type === 'application/pdf') {
      const url = URL.createObjectURL(blob);
      return url;
    }
    // Not a PDF, assume JSON blob with a URL field
    const text = await blob.text();
    try {
      const data = JSON.parse(text);
      const url: string | undefined = data?.url || data?.downloadUrl || data?.download_url || data?.link || data?.data?.url;
      return url ?? null;
    } catch {
      return null;
    }
  } catch (e) {
    console.error('Failed to generate receipt:', e);
    return null;
  }
}

export function formatDateDDMonYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function generateSerial(prefix = 'OGRP'): string {
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return `${prefix}-${year}-${rand}`;
}


