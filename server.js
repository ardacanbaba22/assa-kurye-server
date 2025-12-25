const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'database.json';

// Veritabanını güvenli okuma fonksiyonu (Hata almanı engeller)
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("DB Okuma Hatası:", err);
        return { kuryeler: [], duyurular: [] };
    }
};

// Veritabanını yazma fonksiyonu
const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("DB Yazma Hatası:", err);
    }
};

// 1. Kurye Giriş API
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const db = readDB();
    
    if (!db.kuryeler || !Array.isArray(db.kuryeler)) {
        return res.status(500).json({ message: "Veritabanı yapısı bozuk!" });
    }

    const kurye = db.kuryeler.find(k => k.kurye_id === kurye_id && k.sifre === sifre);

    if (kurye) {
        const token = jwt.sign({ kurye_id }, 'gizli_anahtar');
        res.json({ 
            token, 
            kuryeId: kurye_id,
            merkez_konum: { 
                lat: kurye.vardiya_merkez_lat || 0, 
                lon: kurye.vardiya_merkez_lon || 0 
            }
        });
    } else {
        res.status(401).json({ message: 'Hatalı ID veya Şifre' });
    }
});

// 2. Vardiya Durumu Güncelleme (Admin Paneli İçin)
app.post('/api/courier/vardiya-durum', (req, res) => {
    const { kurye_id, aktif } = req.body;
    let db = readDB();
    
    const index = db.kuryeler.findIndex(k => k.kurye_id === kurye_id);
    if (index !== -1) {
        db.kuryeler[index].aktif = aktif;
        if (aktif) {
            db.kuryeler[index].giris_saati = new Date().toLocaleString('tr-TR');
            db.kuryeler[index].cikis_saati = "Devam Ediyor";
        } else {
            db.kuryeler[index].cikis_saati = new Date().toLocaleString('tr-TR');
        }
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ message: "Kurye bulunamadı" });
    }
});

// 3. Konum Gönderimi
app.post('/api/courier/konum-gonder', (req, res) => {
    // Bu kısım canlı takip ekranı için geliştirilebilir, şu an başarılı döner.
    res.json({ success: true });
});

// 4. Admin: Tüm Kuryeleri Listele
app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => {
    const db = readDB();
    res.json(db.kuryeler || []);
});

// 5. Admin: Kurye Ekle
app.post('/api/admin/kurye-ekle', (req, res) => {
    const data = req.body;
    let db = readDB();
    
    const yeniKurye = {
        kurye_id: data.kurye_id,
        sifre: data.sifre,
        vardiya_merkez_lat: parseFloat(data.vardiya_merkez_lat),
        vardiya_merkez_lon: parseFloat(data.vardiya_merkez_lon),
        aktif: false,
        giris_saati: null,
        cikis_saati: null
    };
    
    db.kuryeler.push(yeniKurye);
    writeDB(db);
    res.json({ message: "Kurye başarıyla eklendi" });
});

// 6. Kurye: Duyuru Çek
app.get('/api/courier/duyuru-cek', (req, res) => {
    const db = readDB();
    const sonDuyuru = db.duyurular && db.duyurular.length > 0 ? db.duyurular[db.duyurular.length - 1] : null;
    res.json({ duyuru: sonDuyuru });
});

// 7. Admin: Duyuru Ekle
app.post('/api/admin/duyuru-ekle', (req, res) => {
    const { baslik, icerik } = req.body;
    let db = readDB();
    if(!db.duyurular) db.duyurular = [];
    
    db.duyurular.push({ baslik, icerik, tarih: new Date().toLocaleString('tr-TR') });
    writeDB(db);
    res.json({ message: "Duyuru yayınlandı" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
