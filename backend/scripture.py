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

BIBLE_BOOKS_ORDER = [
    # Perjanjian Lama (Old Testament)
    ("Genesis", "Kejadian"),
    ("Exodus", "Keluaran"),
    ("Leviticus", "Imamat"),
    ("Numbers", "Bilangan"),
    ("Deuteronomy", "Ulangan"),
    ("Joshua", "Yosua"),
    ("Judges", "Hakim-hakim"),
    ("Ruth", "Rut"),
    ("1 Samuel", "1 Samuel"),
    ("2 Samuel", "2 Samuel"),
    ("1 Kings", "1 Raja-raja"),
    ("2 Kings", "2 Raja-raja"),
    ("1 Chronicles", "1 Tawarikh"),
    ("2 Chronicles", "2 Tawarikh"),
    ("Ezra", "Ezra"),
    ("Nehemiah", "Nehemia"),
    ("Esther", "Ester"),
    ("Job", "Ayub"),
    ("Psalms", "Mazmur"),
    ("Proverbs", "Amsal"),
    ("Ecclesiastes", "Pengkhotbah"),
    ("Song of Solomon", "Kidung Agung"),
    ("Isaiah", "Yesaya"),
    ("Jeremiah", "Yeremia"),
    ("Lamentations", "Ratapan"),
    ("Ezekiel", "Yehezkiel"),
    ("Daniel", "Daniel"),
    ("Hosea", "Hosea"),
    ("Joel", "Yoel"),
    ("Amos", "Amos"),
    ("Obadiah", "Obaja"),
    ("Jonah", "Yunus"),
    ("Micah", "Mikha"),
    ("Nahum", "Nahum"),
    ("Habakkuk", "Habakuk"),
    ("Zephaniah", "Zefanya"),
    ("Haggai", "Hagai"),
    ("Zechariah", "Zakharia"),
    ("Malachi", "Maleakhi"),
    
    # Perjanjian Baru (New Testament)
    ("Matthew", "Matius"),
    ("Mark", "Markus"),
    ("Luke", "Lukas"),
    ("John", "Yohanes"),
    ("Acts", "Kisah Para Rasul"),
    ("Romans", "Roma"),
    ("1 Corinthians", "1 Korintus"),
    ("2 Corinthians", "2 Korintus"),
    ("Galatians", "Galatia"),
    ("Ephesians", "Efesus"),
    ("Philippians", "Filipi"),
    ("Colossians", "Kolose"),
    ("1 Thessalonians", "1 Tesalonika"),
    ("2 Thessalonians", "2 Tesalonika"),
    ("1 Timothy", "1 Timotius"),
    ("2 Timothy", "2 Timotius"),
    ("Titus", "Titus"),
    ("Philemon", "Filemon"),
    ("Hebrews", "Ibrani"),
    ("James", "Yakobus"),
    ("1 Peter", "1 Petrus"),
    ("2 Peter", "2 Petrus"),
    ("1 John", "1 Yohanes"),
    ("2 John", "2 Yohanes"),
    ("3 John", "3 Yohanes"),
    ("Jude", "Yudas"),
    ("Revelation", "Wahyu")
]

def normalize_name(name: str) -> str:
    s = name.lower()
    for c in [" ", ".", ",", "-", "_"]:
        s = s.replace(c, "")
    if s.startswith("iii"):
        s = "3" + s[3:]
    elif s.startswith("ii"):
        s = "2" + s[2:]
    elif s.startswith("i"):
        valid_suffixes_for_1 = [
            "samuel", "sam", "rajaraja", "raj", "tawarikh", "taw", "korintus", "kor",
            "co", "cor", "tesalonika", "tes", "th", "timotius", "tim", "ti", "petrus",
            "pet", "pe", "yohanes", "yoh", "jo", "joh"
        ]
        for suf in valid_suffixes_for_1:
            if s[1:] == suf or s[1:].startswith(suf):
                s = "1" + s[1:]
                break
    return s

def get_book_mapping():
    books_data = [
        # Perjanjian Lama (Old Testament)
        ("Genesis", "Kejadian", ["gen", "kej"]),
        ("Exodus", "Keluaran", ["ex", "exo", "kel"]),
        ("Leviticus", "Imamat", ["lev", "im", "ima"]),
        ("Numbers", "Bilangan", ["num", "bil"]),
        ("Deuteronomy", "Ulangan", ["dt", "deu", "ul", "ula"]),
        ("Joshua", "Yosua", ["josh", "jos", "yos"]),
        ("Judges", "Hakim-hakim", ["jud", "jdg", "hak", "hakim"]),
        ("Ruth", "Rut", ["rut", "rth"]),
        ("1 Samuel", "1 Samuel", ["1sam", "1s", "1sa"]),
        ("2 Samuel", "2 Samuel", ["2sam", "2s", "2sa"]),
        ("1 Kings", "1 Raja-raja", ["1ki", "1king", "1kings", "1raj", "1raja", "1rr"]),
        ("2 Kings", "2 Raja-raja", ["2ki", "2king", "2kings", "2raj", "2raja", "2rr"]),
        ("1 Chronicles", "1 Tawarikh", ["1chr", "1ch", "1taw", "1t"]),
        ("2 Chronicles", "2 Tawarikh", ["2chr", "2ch", "2taw", "2t"]),
        ("Ezra", "Ezra", ["ezr"]),
        ("Nehemiah", "Nehemia", ["neh", "nehem"]),
        ("Esther", "Ester", ["est", "esth"]),
        ("Job", "Ayub", ["ayb", "ayub"]),
        ("Psalms", "Mazmur", ["psa", "psm", "mzm", "maz"]),
        ("Proverbs", "Amsal", ["prov", "pro", "ams", "am"]),
        ("Ecclesiastes", "Pengkhotbah", ["eccl", "ecc", "pkh", "peng"]),
        ("Song of Solomon", "Kidung Agung", ["song", "sol", "kid", "ka"]),
        ("Isaiah", "Yesaya", ["isa", "yes"]),
        ("Jeremiah", "Yeremia", ["jer", "yer"]),
        ("Lamentations", "Ratapan", ["lam", "rat"]),
        ("Ezekiel", "Yehezkiel", ["ezek", "eze", "yeh", "yehez"]),
        ("Daniel", "Daniel", ["dan"]),
        ("Hosea", "Hosea", ["hos"]),
        ("Joel", "Yoel", ["joe", "yoe"]),
        ("Amos", "Amos", ["amo"]),
        ("Obadiah", "Obaja", ["obad", "oba", "obd"]),
        ("Jonah", "Yunus", ["jon", "yun"]),
        ("Micah", "Mikha", ["mic", "mik"]),
        ("Nahum", "Nahum", ["nah"]),
        ("Habakkuk", "Habakuk", ["hab"]),
        ("Zephaniah", "Zefanya", ["zeph", "zep", "zef"]),
        ("Haggai", "Hagai", ["hag"]),
        ("Zechariah", "Zakharia", ["zech", "zec", "zak"]),
        ("Malachi", "Maleakhi", ["mal"]),
        
        # Perjanjian Baru (New Testament)
        ("Matthew", "Matius", ["mat", "matt"]),
        ("Mark", "Markus", ["mrk", "mar", "mk"]),
        ("Luke", "Lukas", ["luk", "luke", "lk"]),
        ("John", "Yohanes", ["joh", "yoh", "jn"]),
        ("Acts", "Kisah Para Rasul", ["act", "kis"]),
        ("Romans", "Roma", ["rom"]),
        ("1 Corinthians", "1 Korintus", ["1cor", "1co", "1kor", "1k"]),
        ("2 Corinthians", "2 Korintus", ["2cor", "2co", "2kor", "2k"]),
        ("Galatians", "Galatia", ["gal"]),
        ("Ephesians", "Efesus", ["eph", "efe"]),
        ("Philippians", "Filipi", ["phil", "phi", "fil", "php"]),
        ("Colossians", "Kolose", ["col", "kol"]),
        ("1 Thessalonians", "1 Tesalonika", ["1the", "1th", "1tes", "1tess"]),
        ("2 Thessalonians", "2 Tesalonika", ["2the", "2th", "2tes", "2tess"]),
        ("1 Timothy", "1 Timotius", ["1tim", "1ti"]),
        ("2 Timothy", "2 Timotius", ["2tim", "2ti"]),
        ("Titus", "Titus", ["tit"]),
        ("Philemon", "Filemon", ["phm", "filem"]),
        ("Hebrews", "Ibrani", ["heb", "ibr"]),
        ("James", "Yakobus", ["jas", "jam", "yak", "yk"]),
        ("1 Peter", "1 Petrus", ["1pet", "1pe", "1petr"]),
        ("2 Peter", "2 Petrus", ["2pet", "2pe", "2petr"]),
        ("1 John", "1 Yohanes", ["1joh", "1jo", "1yoh"]),
        ("2 John", "2 Yohanes", ["2joh", "2jo", "2yoh"]),
        ("3 John", "3 Yohanes", ["3joh", "3jo", "3yoh"]),
        ("Jude", "Yudas", ["jud", "yud"]),
        ("Revelation", "Wahyu", ["rev", "wah"])
    ]
    mapping = {}
    for idx, (eng, ind, aliases) in enumerate(books_data, 1):
        mapping[normalize_name(eng)] = idx
        mapping[normalize_name(ind)] = idx
        for alias in aliases:
            mapping[normalize_name(alias)] = idx
    return mapping

_BOOK_MAPPING = get_book_mapping()

def get_book_number(name: str) -> int:
    norm = normalize_name(name)
    if norm in _BOOK_MAPPING:
        return _BOOK_MAPPING[norm]
    sorted_keys = sorted(_BOOK_MAPPING.keys(), key=len, reverse=True)
    for key in sorted_keys:
        if norm.startswith(key) or key.startswith(norm):
            return _BOOK_MAPPING[key]
    return 0

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
            bnum = get_book_number(bname)
            
            # Fallback ke xml_bnum jika get_book_number gagal (tapi pastikan dia valid 1-66)
            if not bnum:
                xml_bnum = book.get("bnumber")
                try:
                    bnum_val = int(xml_bnum)
                    if 1 <= bnum_val <= 66:
                        bnum = bnum_val
                except:
                    pass
            
            # Jika tidak terdeteksi sama sekali, gunakan bname sebagai key
            key_name = str(bnum) if bnum else bname
            if not key_name:
                continue
                
            bible_data[key_name] = {}
            for chapter in book.findall("CHAPTER"):
                cnum = chapter.get("cnumber")
                bible_data[key_name][cnum] = {}
                for verse in chapter.findall("VERS"):
                    vnum = verse.get("vnumber")
                    bible_data[key_name][cnum][vnum] = verse.text or ""
        
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

@bible_router.delete("/translations/{name}")
async def delete_bible_translation(name: str):
    path = os.path.join(BIBLE_DIR, f"{name}.json")
    if os.path.exists(path):
        os.remove(path)
        return {"status": "success", "message": f"Alkitab '{name}' berhasil dihapus."}
    return {"status": "error", "message": "File tidak ditemukan."}

@bible_router.put("/translations/{name}")
async def rename_bible_translation(name: str, req: dict):
    new_name = req.get("new_name")
    if not new_name:
        return {"status": "error", "message": "Nama baru tidak valid."}
        
    old_path = os.path.join(BIBLE_DIR, f"{name}.json")
    new_path = os.path.join(BIBLE_DIR, f"{new_name}.json")
    
    if os.path.exists(new_path):
        return {"status": "error", "message": f"Alkitab dengan nama '{new_name}' sudah ada."}
        
    if os.path.exists(old_path):
        os.rename(old_path, new_path)
        return {"status": "success", "message": f"Alkitab berhasil diubah menjadi '{new_name}'."}
        
    return {"status": "error", "message": "File tidak ditemukan."}

@bible_router.get("/books")
async def get_bible_books(version: str):
    path = os.path.join(BIBLE_DIR, f"{version}.json")
    if not os.path.exists(path): return {"books": []}
    db = load_json(path)
    
    # Resolusi book names/numbers ke nomor kitab standar 1-66
    book_nums = set()
    for key in db.keys():
        bnum = get_book_number(key)
        if bnum:
            book_nums.add(bnum)
        elif key.isdigit():
            bnum_val = int(key)
            if 1 <= bnum_val <= 66:
                book_nums.add(bnum_val)
                
    sorted_bnums = sorted(list(book_nums))
    
    books = []
    for bnum in sorted_bnums:
        if 1 <= bnum <= len(BIBLE_BOOKS_ORDER):
            books.append(BIBLE_BOOKS_ORDER[bnum - 1][0])
            
    return {"books": books}

@bible_router.get("/chapter")
async def get_bible_chapter(v1: str, book: str, chapter: str, v2: str = ""):
    path1 = os.path.join(BIBLE_DIR, f"{v1}.json")
    if not os.path.exists(path1): return {"status": "error", "message": "Versi utama tidak ditemukan"}
    
    db1 = load_json(path1)
    
    # Resolusi book ke standard book number
    book_num = get_book_number(book)
    book_num_str = str(book_num)
    
    # Resolusi real_book1 (dengan backward compatibility)
    real_book1 = None
    if book_num_str in db1:
        real_book1 = book_num_str
    else:
        if 1 <= book_num <= len(BIBLE_BOOKS_ORDER):
            std_eng, std_ind = BIBLE_BOOKS_ORDER[book_num - 1]
            if std_eng in db1:
                real_book1 = std_eng
            elif std_ind in db1:
                real_book1 = std_ind
        
        if not real_book1:
            def find_real_book(db_keys, search_book):
                s = search_book.lower().replace(" ", "")
                for k in db_keys:
                    if k.lower().replace(" ", "") == s: return k
                for k in db_keys:
                    k_clean = k.lower().replace(" ", "")
                    if k_clean.startswith(s) or s.startswith(k_clean): return k
                return search_book
            real_book1 = find_real_book(db1.keys(), book)
            
    if real_book1 not in db1 or chapter not in db1[real_book1]:
        return {"status": "error", "message": f"Kitab '{book}' atau Pasal {chapter} tidak ditemukan di {v1}."}
        
    db2 = {}
    real_book2 = None
    if v2 and v2 != v1:
        path2 = os.path.join(BIBLE_DIR, f"{v2}.json")
        if os.path.exists(path2):
            db2 = load_json(path2)
            if book_num_str in db2:
                real_book2 = book_num_str
            else:
                if 1 <= book_num <= len(BIBLE_BOOKS_ORDER):
                    std_eng, std_ind = BIBLE_BOOKS_ORDER[book_num - 1]
                    if std_eng in db2:
                        real_book2 = std_eng
                    elif std_ind in db2:
                        real_book2 = std_ind
                if not real_book2:
                    def find_real_book(db_keys, search_book):
                        s = search_book.lower().replace(" ", "")
                        for k in db_keys:
                            if k.lower().replace(" ", "") == s: return k
                        for k in db_keys:
                            k_clean = k.lower().replace(" ", "")
                            if k_clean.startswith(s) or s.startswith(k_clean): return k
                        return search_book
                    real_book2 = find_real_book(db2.keys(), book)
                    
    verses = []
    for v_num, v_text in db1[real_book1][chapter].items():
        v2_text = ""
        if db2 and real_book2 and real_book2 in db2:
            v2_text = db2[real_book2].get(chapter, {}).get(v_num, "")
        verses.append({
            "verse": v_num,
            "text1": v_text,
            "text2": v2_text
        })
        
    canonical_book_name = BIBLE_BOOKS_ORDER[book_num - 1][0] if (1 <= book_num <= len(BIBLE_BOOKS_ORDER)) else book
    
    return {
        "status": "success",
        "book_name": canonical_book_name,
        "data": verses
    }
