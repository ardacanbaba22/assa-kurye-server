const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'database.json';

const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { kuryeler: [], duyurular: {} };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) { return { kuryeler: [], duyurular: {} }; }
};
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- 1. KURYE EKLEME (BURASI HATALIYDI, DÜZELDİ) ---
app.post('/api/admin/kurye-ekle', (req, res) => {
    let db = readDB();
    const { kurye_id, sifre, vardiya_merkez_lat, vardiya_merkez_lon } = req.body;
    
    // Aynı ID varsa ekleme
    if (db.kuryeler.find(k => k.kurye_id === kurye_id)) {
        return res.status(400).json({ message: "Bu ID zaten kayıtlı!" });
    }

    db.kuryeler.push({
        kurye_id,
        sifre,
        vardiya_merkez_lat: parseFloat(vardiya_merkez_lat),
        vardiya_merkez_lon: parseFloat(vardiya_merkez_lon),
        aktif: false,
        lat: 0,
        lon: 0,
        son_hedef: "Görev Bekliyor"
    });
    
    writeDB(db);
    res.json({ message: "Kurye başarıyla eklendi!" });
});

// --- 2. ÖZEL KONUM YOLLAMA ---
app.post('/api/admin/duyuru-ekle', (req, res) => {
    const { kurye_id, hedef_lat, hedef_lon } = req.body;
    let db = readDB();
    if(!db.duyurular) db.duyurular = {};
    
    db.duyurular[kurye_id] = { 
        hedef_lat: parseFloat(hedef_lat), 
        hedef_lon: parseFloat(hedef_lon),
        tarih: new Date().toLocaleString('tr-TR') 
    };
    
    // Tabloya yansıması için kurye bilgisine de yazıyoruz
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(idx !== -1) db.kuryeler[idx].son_hedef = `Hedef: ${hedef_lat}/${hedef_lon}`;

    writeDB(db);
    res.json({ message: "Konum iletildi." });
});

// --- 3. LİSTELEME ---
app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => {
    res.json(readDB().kuryeler || []);
});

// --- 4. KURYE API'LERİ ---
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const db = readDB();
    const kurye = db.kuryeler.find(k => k.kurye_id === kurye_id && k.sifre === sifre);
    if (kurye) {
        res.json({ kuryeId: kurye_id, merkez_konum: { lat: kurye.vardiya_merkez_lat, lon: kurye.vardiya_merkez_lon } });
    } else { res.status(401).json({ message: 'Hatalı Giriş' }); }
});

app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = readDB();
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if (idx !== -1) {
        db.kuryeler[idx].aktif = aktif;
        db.kuryeler[idx].giris_saati = aktif ? new Date().toLocaleString('tr-TR') : "";
        writeDB(db);
        res.json({ success: true });
    }
});

app.post('/api/courier/konum-gonder', (req, res) => {
    const { kurye_id, lat, lon } = req.body;
    let db = readDB();
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if (idx !== -1) {
        db.kuryeler[idx].lat = lat; db.kuryeler[idx].lon = lon;
        writeDB(db);
    }
    res.json({ success: true });
});

app.get('/api/courier/duyuru-cek/:kurye_id', (req, res) => {
    const db = readDB();
    res.json({ duyuru: db.duyurular ? db.duyurular[req.params.kurye_id] : null });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Sistem aktif: ${PORT}`));
