import os
import json
import datetime
import xml.etree.ElementTree as ET
from fastapi import APIRouter, File, UploadFile
from config import SCRIPTURE_PRESETS_FILE, SCRIPTURE_HISTORY_FILE, SCRIPTURE_SETTINGS_FILE, BIBLE_DIR, load_json, save_json

presets_router = APIRouter()
bible_router = APIRouter()

def load_scripture_settings() -> dict:
    if not os.path.exists(SCRIPTURE_SETTINGS_FILE):
        return {"selected_translations": []}
    try:
        return load_json(SCRIPTURE_SETTINGS_FILE)
    except:
        return {"selected_translations": []}

def save_scripture_settings(data: dict):
    try:
        save_json(SCRIPTURE_SETTINGS_FILE, data)
    except Exception as e:
        print(f"[SCRIPTURE] Failed to save scripture settings: {e}")

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
    s = str(name).lower()
    for c in [" ", ".", ",", "-", "_"]:
        s = s.replace(c, "")
    return s

def get_book_mapping():
    books_data = [
        # Perjanjian Lama (Old Testament)
        ("Genesis", "Kejadian", ["gen", "kej"]),
        ("Exodus", "Keluaran", ["ex", "exo", "kel"]),
        ("Leviticus", "Imamat", ["lev", "im", "ima", "imam", "imamat", "leviticus"]),
        ("Numbers", "Bilangan", ["num", "bil"]),
        ("Deuteronomy", "Ulangan", ["dt", "deu", "deut", "ul", "ula"]),
        ("Joshua", "Yosua", ["josh", "jos", "yos"]),
        ("Judges", "Hakim-hakim", ["jud", "jdg", "judg", "hak", "hakim"]),
        ("Ruth", "Rut", ["rut", "rth", "ruth"]),
        ("1 Samuel", "1 Samuel", ["1sam", "1s", "1sa"]),
        ("2 Samuel", "2 Samuel", ["2sam", "2s", "2sa"]),
        ("1 Kings", "1 Raja-raja", ["1ki", "1king", "1kings", "1kgs", "1kg", "1raj", "1raja", "1rr"]),
        ("2 Kings", "2 Raja-raja", ["2ki", "2king", "2kings", "2kgs", "2kg", "2raj", "2raja", "2rr"]),
        ("1 Chronicles", "1 Tawarikh", ["1chr", "1ch", "1taw", "1t"]),
        ("2 Chronicles", "2 Tawarikh", ["2chr", "2ch", "2taw", "2t"]),
        ("Ezra", "Ezra", ["ezr", "ezra"]),
        ("Nehemiah", "Nehemia", ["neh", "nehem", "nehemiah"]),
        ("Esther", "Ester", ["est", "esth", "esther"]),
        ("Job", "Ayub", ["ayb", "ayub", "job"]),
        ("Psalms", "Mazmur", ["psa", "psm", "mzm", "maz", "ps", "psalm", "psalms"]),
        ("Proverbs", "Amsal", ["prov", "pro", "ams", "amsal", "proverbs"]),
        ("Ecclesiastes", "Pengkhotbah", ["eccl", "ecc", "pkh", "peng", "pengkhotbah", "ecclesiastes"]),
        ("Song of Solomon", "Kidung Agung", ["song", "sol", "kid", "ka", "kidungagung", "songofsolomon"]),
        ("Isaiah", "Yesaya", ["isa", "yes", "isaiah", "yesaya"]),
        ("Jeremiah", "Yeremia", ["jer", "yer", "jeremiah", "yeremia"]),
        ("Lamentations", "Ratapan", ["lam", "rat", "lamentations", "ratapan"]),
        ("Ezekiel", "Yehezkiel", ["ezek", "eze", "yeh", "yehez", "ezekiel", "yehezkiel"]),
        ("Daniel", "Daniel", ["dan", "daniel"]),
        ("Hosea", "Hosea", ["hos", "hosea"]),
        ("Joel", "Yoel", ["joe", "yoe", "joel", "yoel", "yl"]),
        ("Amos", "Amos", ["am", "amo", "amos"]),
        ("Obadiah", "Obaja", ["ob", "obad", "oba", "obd", "obaja", "obadiah"]),
        ("Jonah", "Yunus", ["jon", "yun", "jonah", "yunus"]),
        ("Micah", "Mikha", ["mi", "mic", "mik", "micah", "mikha"]),
        ("Nahum", "Nahum", ["nah", "nahum"]),
        ("Habakkuk", "Habakuk", ["hab", "habakkuk", "habakuk"]),
        ("Zephaniah", "Zefanya", ["zeph", "zep", "zef", "zephaniah", "zefanya"]),
        ("Haggai", "Hagai", ["hag", "haggai", "hagai"]),
        ("Zechariah", "Zakharia", ["za", "zech", "zec", "zak", "zechariah", "zakharia"]),
        ("Malachi", "Maleakhi", ["mal", "malachi", "maleakhi"]),
        
        # Perjanjian Baru (New Testament)
        ("Matthew", "Matius", ["mat", "matt", "matius", "matthew"]),
        ("Mark", "Markus", ["mrk", "mar", "mk", "mark", "markus"]),
        ("Luke", "Lukas", ["luk", "luke", "lk", "lukas"]),
        ("John", "Yohanes", ["joh", "yoh", "jn", "john", "yohanes"]),
        ("Acts", "Kisah Para Rasul", ["act", "acts", "kis", "kisahpararasul"]),
        ("Romans", "Roma", ["rom", "rm", "roma", "romans"]),
        ("1 Corinthians", "1 Korintus", ["1cor", "1co", "1kor", "1k", "1corinthians", "1korintus"]),
        ("2 Corinthians", "2 Korintus", ["2cor", "2co", "2kor", "2k", "2corinthians", "2korintus"]),
        ("Galatians", "Galatia", ["gal", "galatia", "galatians"]),
        ("Ephesians", "Efesus", ["eph", "efe", "ef", "efesus", "ephesians"]),
        ("Philippians", "Filipi", ["flp", "phil", "phi", "fil", "php", "philip", "filipi", "philippians"]),
        ("Colossians", "Kolose", ["col", "kol", "kolose", "colossians"]),
        ("1 Thessalonians", "1 Tesalonika", ["1thes", "1the", "1th", "1tes", "1tess", "1tesalonika", "1thessalonians"]),
        ("2 Thessalonians", "2 Tesalonika", ["2thes", "2the", "2th", "2tes", "2tess", "2tesalonika", "2thessalonians"]),
        ("1 Timothy", "1 Timotius", ["1tim", "1ti", "1timotius", "1timothy"]),
        ("2 Timothy", "2 Timotius", ["2tim", "2ti", "2timotius", "2timothy"]),
        ("Titus", "Titus", ["tit", "titus"]),
        ("Philemon", "Filemon", ["flm", "phm", "filem", "philem", "filemon", "philemon"]),
        ("Hebrews", "Ibrani", ["heb", "ibr", "ib", "ibra", "ibrani", "hebrew", "hebrews"]),
        ("James", "Yakobus", ["jas", "jam", "yak", "yk", "james", "yakobus"]),
        ("1 Peter", "1 Petrus", ["1ptr", "1pet", "1pe", "1petr", "1peter", "1petrus"]),
        ("2 Peter", "2 Petrus", ["2ptr", "2pet", "2pe", "2petr", "2peter", "2petrus"]),
        ("1 John", "1 Yohanes", ["1jn", "1joh", "1jo", "1yoh", "1john", "1yohanes"]),
        ("2 John", "2 Yohanes", ["2jn", "2joh", "2jo", "2yoh", "2john", "2yohanes"]),
        ("3 John", "3 Yohanes", ["3jn", "3joh", "3jo", "3yoh", "3john", "3yohanes"]),
        ("Jude", "Yudas", ["jud", "yud", "jude", "yudas"]),
        ("Revelation", "Wahyu", ["why", "rev", "wah", "revelation", "wahyu"])
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
    s = str(name).strip()
    if s.isdigit():
        bnum_val = int(s)
        if 1 <= bnum_val <= 66:
            return bnum_val
    norm = normalize_name(s)
    if norm.isdigit():
        bnum_val = int(norm)
        if 1 <= bnum_val <= 66:
            return bnum_val
    if norm in _BOOK_MAPPING:
        return _BOOK_MAPPING[norm]
    sorted_keys = sorted(_BOOK_MAPPING.keys(), key=len, reverse=True)
    for key in sorted_keys:
        if norm.startswith(key):
            return _BOOK_MAPPING[key]
    if len(norm) >= 3:
        for key in sorted_keys:
            if key.startswith(norm):
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
    settings = load_scripture_settings()
    saved_selected = settings.get("selected_translations", [])
    valid_selected = [s for s in saved_selected if s in files]
    if not valid_selected and files:
        valid_selected = [files[0]]
    return {"status": "success", "translations": files, "selected": valid_selected}

@bible_router.post("/selected_translations")
async def save_selected_translations(req: dict):
    selected = req.get("selected", [])
    if not isinstance(selected, list):
        return {"status": "error", "message": "Format selected tidak valid"}
    clean_selected = [str(x).strip() for x in selected if str(x).strip()][:2]
    settings = load_scripture_settings()
    settings["selected_translations"] = clean_selected
    save_scripture_settings(settings)
    return {"status": "success", "selected": clean_selected}

@bible_router.delete("/translations/{name}")
async def delete_bible_translation(name: str):
    path = os.path.join(BIBLE_DIR, f"{name}.json")
    if os.path.exists(path):
        os.remove(path)
        settings = load_scripture_settings()
        selected = settings.get("selected_translations", [])
        if name in selected:
            settings["selected_translations"] = [s for s in selected if s != name]
            save_scripture_settings(settings)
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
        settings = load_scripture_settings()
        selected = settings.get("selected_translations", [])
        if name in selected:
            settings["selected_translations"] = [new_name if s == name else s for s in selected]
            save_scripture_settings(settings)
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
        s = str(key).strip()
        if s.isdigit() and 1 <= int(s) <= 66:
            book_nums.add(int(s))
        else:
            bnum = get_book_number(key)
            if bnum:
                book_nums.add(bnum)
                
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
            # Resolusi real_book2 — identik dengan logika db1
            if book_num_str in db2:
                real_book2 = book_num_str
            else:
                if 1 <= book_num <= len(BIBLE_BOOKS_ORDER):
                    std_eng2, std_ind2 = BIBLE_BOOKS_ORDER[book_num - 1]
                    if std_eng2 in db2:
                        real_book2 = std_eng2
                    elif std_ind2 in db2:
                        real_book2 = std_ind2
                if not real_book2:
                    def find_real_book2(db_keys, search_book):
                        s = search_book.lower().replace(" ", "")
                        for k in db_keys:
                            if k.lower().replace(" ", "") == s: return k
                        for k in db_keys:
                            k_clean = k.lower().replace(" ", "")
                            if k_clean.startswith(s) or s.startswith(k_clean): return k
                        return None  # Return None if not found (bukan search_book)
                    real_book2 = find_real_book2(db2.keys(), book)
                    if not real_book2 and 1 <= book_num <= len(BIBLE_BOOKS_ORDER):
                        # Coba dengan English name
                        real_book2 = find_real_book2(db2.keys(), BIBLE_BOOKS_ORDER[book_num - 1][0])
                    if not real_book2:
                        # Coba dengan Indonesian name  
                        real_book2 = find_real_book2(db2.keys(), BIBLE_BOOKS_ORDER[book_num - 1][1])
                    
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


# ==========================================
# 📜 SCRIPTURE HISTORY ENDPOINTS
# ==========================================
def load_scripture_history() -> dict:
    """Load history JSON and auto-purge previous day's entries."""
    today_str = datetime.date.today().isoformat()
    if not os.path.exists(SCRIPTURE_HISTORY_FILE):
        return {"date": today_str, "history": []}
    data = load_json(SCRIPTURE_HISTORY_FILE)
    if not isinstance(data, dict):
        return {"date": today_str, "history": []}
    
    # Auto-purge if day has passed
    if data.get("date") != today_str:
        fresh = {"date": today_str, "history": []}
        try:
            save_json(SCRIPTURE_HISTORY_FILE, fresh)
        except Exception:
            pass
        return fresh
    
    if not isinstance(data.get("history"), list):
        data["history"] = []
    return data

@bible_router.get("/history")
async def get_scripture_history():
    data = load_scripture_history()
    return {"status": "success", "date": data.get("date"), "history": data.get("history", [])}

@bible_router.post("/history")
async def add_scripture_history(payload: dict):
    book = str(payload.get("book") or "").strip()
    chapter = str(payload.get("chapter") or "1").strip()
    verse = str(payload.get("verse") or "1").strip()
    
    if not book:
        return {"status": "error", "message": "Book is required"}
    
    time_str = payload.get("time") or datetime.datetime.now().strftime("%H:%M")
    
    data = load_scripture_history()
    today_str = datetime.date.today().isoformat()
    history = data.get("history", [])
    
    # Filter out duplicate (same canonical book, chapter, verse)
    history = [
        item for item in history
        if not (
            str(item.get("book", "")).strip().lower() == book.lower()
            and str(item.get("chapter", "")).strip() == chapter
            and str(item.get("verse", "")).strip() == verse
        )
    ]
    
    # Add to beginning
    history.insert(0, {
        "book": book,
        "chapter": chapter,
        "verse": verse,
        "time": time_str
    })
    
    # Limit to 50 latest items
    history = history[:50]
    
    new_data = {"date": today_str, "history": history}
    save_json(SCRIPTURE_HISTORY_FILE, new_data)
    return {"status": "success", "history": history}

@bible_router.delete("/history")
async def clear_scripture_history():
    today_str = datetime.date.today().isoformat()
    new_data = {"date": today_str, "history": []}
    save_json(SCRIPTURE_HISTORY_FILE, new_data)
    return {"status": "success", "message": "History cleared"}

