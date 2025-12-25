const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'database.json';

// Veritabanı Okuma (Hata Korumalı)
const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { kuryeler: [], duyurular: [] };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { kuryeler: [], duyurular: [] };
    }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const db = readDB();
    const kurye = (db.kuryeler || []).find(k => k.kurye_id === kurye_id && k.sifre === sifre);

    if (kurye) {
        const token = jwt.sign({ kurye_id }, 'gizli_anahtar');
        res.json({ token, kuryeId: kurye_id, merkez_konum: { lat: kurye.vardiya_merkez_lat, lon: kurye.vardiya_merkez_lon } });
    } else {
        res.status(401).json({ message: 'Hatalı ID veya Şifre' });
    }
});

app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = readDB();
    const idx = (db.kuryeler || []).findIndex(k => k.kurye_id === kurye_id);
    if (idx !== -1) {
        db.kuryeler[idx].aktif = aktif;
        db.kuryeler[idx].giris_saati = aktif ? new Date().toLocaleString('tr-TR') : db.kuryeler[idx].giris_saati;
        db.kuryeler[idx].cikis_saati = aktif ? "Devam Ediyor" : new Date().toLocaleString('tr-TR');
        writeDB(db);
        res.json({ success: true });
    } else { res.status(404).send(); }
});

app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => res.json(readDB().kuryeler || []));

app.post('/api/admin/kurye-ekle', (req, res) => {
    let db = readDB();
    db.kuryeler.push({ ...req.body, aktif: false, giris_saati: null, cikis_saati: null });
    writeDB(db);
    res.json({ message: "Başarılı" });
});

app.post('/api/courier/konum-gonder', (req, res) => res.json({ success: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server çalışıyor: ${PORT}`));
