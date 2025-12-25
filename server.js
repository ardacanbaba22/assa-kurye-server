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

// Admin: Yeni Konum Gönder (Kurye ID bazlı)
app.post('/api/admin/duyuru-ekle', (req, res) => {
    const { kurye_id, hedef_lat, hedef_lon, baslik } = req.body;
    let db = readDB();
    
    if(!db.duyurular) db.duyurular = {};
    
    // Kuryenin çekmecesine yeni hedefi koyuyoruz
    db.duyurular[kurye_id] = {
        hedef_lat: parseFloat(hedef_lat),
        hedef_lon: parseFloat(hedef_lon),
        baslik: baslik || "Yeni Görev",
        yeni: true // Kurye bunu henüz görmedi
    };

    // Tabloda görünmesi için kurye bilgisine de yaz
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(idx !== -1) db.kuryeler[idx].son_hedef = baslik || "Yeni Görev";

    writeDB(db);
    res.json({ success: true, message: "Konum kuryeye basıldı." });
});

// Kurye: Kendi hedefini çek
app.get('/api/courier/duyuru-cek/:kurye_id', (req, res) => {
    const db = readDB();
    const hedef = db.duyurular ? db.duyurular[req.params.kurye_id] : null;
    res.json({ duyuru: hedef });
});

// Kurye Kayıt ve Liste (Hatasız)
app.post('/api/admin/kurye-ekle', (req, res) => {
    let db = readDB();
    db.kuryeler.push({ ...req.body, aktif: false, lat: 0, lon: 0, son_hedef: "Bekliyor" });
    writeDB(db);
    res.json({ message: "Kurye Eklendi" });
});

app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => res.json(readDB().kuryeler || []));

// Login ve Durum (Standart)
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const kurye = readDB().kuryeler.find(k => k.kurye_id === kurye_id && k.sifre === sifre);
    if (kurye) res.json({ kuryeId: kurye_id, merkez_konum: { lat: kurye.vardiya_merkez_lat, lon: kurye.vardiya_merkez_lon } });
    else res.status(401).send();
});

app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = readDB();
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(idx !== -1) { db.kuryeler[idx].aktif = aktif; writeDB(db); }
    res.json({ success: true });
});

app.post('/api/courier/konum-gonder', (req, res) => {
    const { kurye_id, lat, lon } = req.body;
    let db = readDB();
    const idx = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if(idx !== -1) { db.kuryeler[idx].lat = lat; db.kuryeler[idx].lon = lon; writeDB(db); }
    res.json({ success: true });
});

app.listen(process.env.PORT || 5000);
