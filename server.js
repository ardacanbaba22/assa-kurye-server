const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

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

// Admin: Kurye Ekle
app.post('/api/admin/kurye-ekle', (req, res) => {
    let db = readDB();
    db.kuryeler.push({ ...req.body, aktif: false, lat: 0, lon: 0, son_hedef: "Bekliyor" });
    writeDB(db);
    res.json({ success: true });
});

// Admin: Konum/Duyuru Gönder
app.post('/api/admin/duyuru-ekle', (req, res) => {
    const { kurye_id, hedef_lat, hedef_lon, baslik, icerik } = req.body;
    let db = readDB();
    if(!db.duyurular) db.duyurular = {};
    db.duyurular[kurye_id] = { hedef_lat, hedef_lon, baslik, icerik };
    
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(idx !== -1) db.kuryeler[idx].son_hedef = baslik || "Yeni Hedef";
    
    writeDB(db);
    res.json({ success: true });
});

// Kurye: Veri Çek (Duyuru & Hedef)
app.get('/api/courier/duyuru-cek/:kurye_id', (req, res) => {
    const db = readDB();
    const d = db.duyurular ? db.duyurular[req.params.kurye_id] : null;
    res.json({ duyuru: d });
});

// Kurye: Login
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const db = readDB();
    const kurye = db.kuryeler.find(k => k.kurye_id === kurye_id && k.sifre === sifre);
    if (kurye) res.json({ kuryeId: kurye_id, merkez_konum: { lat: kurye.vardiya_merkez_lat, lon: kurye.vardiya_merkez_lon } });
    else res.status(401).json({ message: "Hatalı Giriş" });
});

// Kurye: Konum ve Vardiya
app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = readDB();
    const i = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(i !== -1) { db.kuryeler[i].aktif = aktif; writeDB(db); }
    res.json({ success: true });
});

app.post('/api/courier/konum-gonder', (req, res) => {
    const { kurye_id, lat, lon } = req.body;
    let db = readDB();
    const i = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(i !== -1) { db.kuryeler[i].lat = lat; db.kuryeler[i].lon = lon; writeDB(db); }
    res.json({ success: true });
});

app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => res.json(readDB().kuryeler || []));

app.listen(process.env.PORT || 5000);
