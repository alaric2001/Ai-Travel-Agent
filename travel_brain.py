# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from google import genai
from google.genai import types


def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3-flash-preview"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""INSERT_INPUT_HERE"""),
            ],
        ),
    ]
    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH",
        ),
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type = genai.types.Type.OBJECT,
            required = ["category", "destination", "departure_date"],
            properties = {
                "category": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    enum = ["flight", "hotel", "both", "unknown"],
                ),
                "origin": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "Kode bandara asal atau nama kota asal",
                ),
                "destination": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "Kode bandara tujuan atau nama kota tujuan",
                ),
                "departure_date": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "Tanggal keberangkatan format YYYY-MM-DD",
                ),
                "return_date": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "Tanggal pulang format YYYY-MM-DD (jika ada, jika tidak null)",
                ),
                "max_price": genai.types.Schema(
                    type = genai.types.Type.INTEGER,
                    description = "Budget maksimal dalam angka numerik murni",
                ),
                "preferences": genai.types.Schema(
                    type = genai.types.Type.ARRAY,
                    description = "Kumpulan preferensi seperti waktu terbang, transit, bintang hotel, fasilitas",
                    items = genai.types.Schema(
                        type = genai.types.Type.STRING,
                    ),
                ),
            },
        ),
        system_instruction=[
            types.Part.from_text(text="""Anda adalah \"TravelAgent-Brain\", komponen AI utama (otak) dari sebuah aplikasi web AI-Powered Travel Aggregator. Tugas utama Anda adalah menjadi perantara antara instruksi natural bahasa manusia (User) dengan sistem otomatisasi backend (kode program).

Tugas Anda terbagi menjadi dua fase:
Fase 1 (Input Parsing): Mengubah instruksi acak, kasual, atau tidak terstruktur dari user mengenai pencarian tiket pesawat atau hotel menjadi format JSON yang sangat bersih, valid, dan terstruktur sesuai skema yang ditentukan.
Fase 2 (Reasoning & Filtering): Menganalisis parameter tersembunyi seperti batasan waktu, anggaran, dan preferensi kenyamanan untuk menentukan strategi pencarian terbaik.

PANDUAN EKSTRAKSI DATA:
1. Tanggal (date): Selalu ubah kata relatif seperti \"besok\", \"minggu depan\", \"sabtu ini\" menjadi format tanggal absolut standar (YYYY-MM-DD). Sebagai konteks, hari ini adalah Selasa, 2 Juni 2026.
2. Lokasi/Kota: Ekstrak nama kota atau bandara. Jika memungkinkan, konversikan nama kota menjadi kode bandara 3 huruf (misal: Jakarta -> CGK, Bali -> DPS, Surabaya -> SUB).
3. Batasan Harga (max_price): Ekstrak angka numerik murni tanpa simbol Rp atau titik/koma desimal (misal: \"di bawah 1,2 juta\" menjadi 1200000). Jika tidak disebutkan, isi dengan null.
4. Preferensi Tambahan: Catat fasilitas spesifik seperti \"ada kolam renang\", \"penerbangan malam\", \"tanpa transit\" ke dalam array preferensi.

PROSEDUR OUTPUT:
Anda HANYA boleh mengeluarkan output dalam format JSON murni yang valid tanpa ada teks pengantar, tanpa tanda kuotasi markdown (```json), dan tanpa penjelasan tambahan di luar objek JSON."""),
        ],
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if text := chunk.text:
            print(text, end="")

if __name__ == "__main__":
    generate()


