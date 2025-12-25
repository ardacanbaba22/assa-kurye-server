const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'database.json';

// Kurye Giriş API
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    const kurye = db.kuryeler.find(k => k.kurye_id === kurye_id && k.sifre === sifre);

    if (kurye) {
        const token = jwt.sign({ kurye_id }, 'gizli_anahtar');
        res.json({ 
            token, 
            kuryeId: kurye_id,
            merkez_konum: { lat: kurye.vardiya_merkez_lat, lon: kurye.vardiya_merkez_lon }
        });
    } else { res.status(401).json({ message: 'Hatalı ID veya Şifre' }); }
});

// Vardiya Durumunu Admin'e Bildir
app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = JSON.parse(fs.readFileSync(DB_FILE));
    const index = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if (index !== -1) {
        db.kuryeler[index].aktif = aktif;
        db.kuryeler[index].giris_saati = aktif ? new Date().toLocaleString('tr-TR') : db.kuryeler[index].giris_saati;
        db.kuryeler[index].cikis_saati = aktif ? null : new Date().toLocaleString('tr-TR');
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else { res.status(404).send(); }
});

// Admin API
app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_FILE));
    res.json(db.kuryeler);
});

// Konum API
app.post('/api/courier/konum-gonder', (req, res) => { res.json({ success: true }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Sunucu Aktif"));
