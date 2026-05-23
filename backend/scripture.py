import os
import json
import xml.etree.ElementTree as ET
from fastapi import APIRouter, File, UploadFile
from config import SCRIPTURE_PRESETS_FILE, BIBLE_DIR, load_json, save_json

presets_router = APIRouter()
bible_router = APIRouter()

def load_scripture_db():
    if not os.path.exists(SCRIPTURE_PRESETS_FILE):
        return {"default_disp": "", "default_lt": "", "presets": {}}
    with open(SCRIPTURE_PRESETS_FILE, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            # Backward compatibility kalau file json lama belum ada key "presets"
            if "presets" not in data:
                return {"default_disp": "", "default_lt": "", "presets": data}
            
            # Migrasi data default lama ke format baru
            if "default" in data and "default_disp" not in data:
                data["default_disp"] = data["default"]
                data["default_lt"] = data["default"]
                
            if "default_disp" not in data: data["default_disp"] = ""
            if "default_lt" not in data: data["default_lt"] = ""
            
            return data
        except:
            return {"default_disp": "", "default_lt": "", "presets": {}}

@presets_router.post("/default/{target}/{name}")
async def set_default_scripture_preset(target: str, name: str):
    db = load_scripture_db()
    if target == "disp":
        db["default_disp"] = name
    elif target == "lt":
        db["default_lt"] = name
    else:
        db["default"] = name # Fallback
        
    with open(SCRIPTURE_PRESETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=4)
    return {"status": "success"}

@presets_router.get("")
async def get_scripture_presets():
    return load_scripture_db()

@presets_router.post("/{name}")
async def save_scripture_preset(name: str, payload: dict):
    # 🎯 FIX BUG: Pastikan kita tidak menyimpan data XML (versi/kitab) 
    # ke dalam preset visual. Kita cuma butuh struktur 'display' & 'lt'.
    
    # Bersihkan jika payload adalah data XML mentah dari Grid
    if "verses" in payload or "books" in payload:
        return {"status": "error", "message": "Gagal: Ini adalah data XML, bukan preset visual."}

    # Backward compatibility: Ambil data display/lt kalau ada
    clean_payload = {
        "disp": payload.get("disp", {}),
        "lt": payload.get("lt", {})
    }
    
    # Jika payload langsung berisi config (save as), coba mapping
    if not clean_payload["disp"] and payload.get("mode"):
        clean_payload["disp"] = payload 
    
    db = load_scripture_db()
    db["presets"][name] = clean_payload # Simpan data bersih
    with open(SCRIPTURE_PRESETS_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=4)
    return {"status": "success", "message": f"Preset '{name}' disimpan"}

@presets_router.delete("/{name}")
async def delete_scripture_preset(name: str):
    db = load_scripture_db()
    if name in db["presets"]:
        del db["presets"][name]
        # Hapus default jika preset yang sedang jadi default ikut dihapus
        if db.get("default_disp") == name:
            db["default_disp"] = ""
        if db.get("default_lt") == name:
            db["default_lt"] = ""
        if db.get("default") == name:
            db["default"] = ""
            
        with open(SCRIPTURE_PRESETS_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4)
    return {"status": "success"}

@bible_router.post("/import")
async def import_bible(file: UploadFile = File(...)):
    if not file.filename.endswith(".xml"):
        return {"status": "error", "message": "File harus berformat XML!"}
    
    try:
        content = await file.read()
        root = ET.fromstring(content)
        bible_data = {}
        
        # Parsing XMLBIBLE -> BIBLEBOOK -> CHAPTER -> VERS
        for book in root.findall("BIBLEBOOK"):
            bname = book.get("bname")
            bible_data[bname] = {}
            for chapter in book.findall("CHAPTER"):
                cnum = chapter.get("cnumber")
                bible_data[bname][cnum] = {}
                for verse in chapter.findall("VERS"):
                    vnum = verse.get("vnumber")
                    # Tangkap teksnya (kalau kosong jadikan string kosong)
                    bible_data[bname][cnum][vnum] = verse.text or ""
        
        # Simpan sebagai JSON super cepat (Nama file tanpa .xml)
        clean_name = file.filename.replace(".xml", "")
        save_json(os.path.join(BIBLE_DIR, f"{clean_name}.json"), bible_data)
        
        return {"status": "success", "message": f"Alkitab '{clean_name}' berhasil diimpor!"}
    except Exception as e:
        return {"status": "error", "message": f"Gagal parsing XML: {str(e)}"}

@bible_router.get("/translations")
async def get_bible_translations():
    files = [f.replace(".json", "") for f in os.listdir(BIBLE_DIR) if f.endswith(".json")]
    return {"status": "success", "translations": files}

@bible_router.get("/books")
async def get_bible_books(version: str):
    path = os.path.join(BIBLE_DIR, f"{version}.json")
    if not os.path.exists(path): return {"books": []}
    db = load_json(path)
    return {"books": list(db.keys())}

@bible_router.get("/chapter")
async def get_bible_chapter(v1: str, book: str, chapter: str, v2: str = ""):
    path1 = os.path.join(BIBLE_DIR, f"{v1}.json")
    if not os.path.exists(path1): return {"status": "error", "message": "Versi utama tidak ditemukan"}
    
    db1 = load_json(path1)
    
    # 🎯 FIX BUG 1: Mesin pencari kitab cerdas (Fuzzy & Prefix Match)
    def find_real_book(db_keys, search_book):
        s = search_book.lower().replace(" ", "")
        # Cek kesamaan persis
        for k in db_keys:
            if k.lower().replace(" ", "") == s: return k
        # Cek singkatan (Contoh: 'Gen' akan cocok dengan 'Genesis')
        for k in db_keys:
            k_clean = k.lower().replace(" ", "")
            if k_clean.startswith(s) or s.startswith(k_clean): return k
        return search_book
        
    real_book1 = find_real_book(db1.keys(), book)
    
    if real_book1 not in db1 or chapter not in db1[real_book1]:
        return {"status": "error", "message": f"Kitab '{book}' atau Pasal {chapter} tidak ditemukan di {v1}."}
    
    db2 = {}
    real_book2 = book
    if v2 and v2 != v1:
        path2 = os.path.join(BIBLE_DIR, f"{v2}.json")
        if os.path.exists(path2): 
            db2 = load_json(path2)
            real_book2 = find_real_book(db2.keys(), book) # Cari singkatan untuk versi 2
        
    verses = []
    for v_num, v_text in db1[real_book1][chapter].items():
        v2_text = db2.get(real_book2, {}).get(chapter, {}).get(v_num, "") if db2 else ""
        verses.append({
            "verse": v_num,
            "text1": v_text,
            "text2": v2_text
        })
        
    return {"status": "success", "data": verses}
