const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs'); // Dosya okuma/yazma için

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = "kurye_takip_gizli_anahtar";
const DATA_FILE = './database.json';

// Veritabanı dosyasını kontrol et, yoksa oluştur
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ kuryeler: {}, duyuru: {} }));
}

// Verileri dosyadan okuma yardımcı fonksiyonu
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE));
// Verileri dosyaya yazma yardımcı fonksiyonu
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// --- API'LAR ---

// 1. Kurye Ekleme
app.post('/api/admin/kurye-ekle', (req, res) => {
    const data = readData();
    const { kurye_id, sifre, vardiya_merkez_lat, vardiya_merkez_lon } = req.body;
    
    data.kuryeler[kurye_id] = {
        kurye_id, sifre,
        merkez: { lat: vardiya_merkez_lat, lon: vardiya_merkez_lon },
        aktif: false,
        giris_saati: null, cikis_saati: null,
        son_konum: null
    };
    
    writeData(data);
    res.status(200).send({ message: "Kurye başarıyla kaydedildi!", docId: kurye_id });
});

// 2. Kurye Girişi
app.post('/api/auth/login', (req, res) => {
    const { kurye_id, sifre } = req.body;
    const data = readData();
    const kurye = data.kuryeler[kurye_id];

    if (!kurye || kurye.sifre !== sifre) {
        return res.status(401).send({ message: "ID veya Şifre hatalı!" });
    }

    const token = jwt.sign({ kuryeId: kurye_id }, SECRET_KEY, { expiresIn: '12h' });
    res.status(200).send({ token, kuryeId: kurye_id });
});

// 3. Konum Gönder (Otomatik)
app.post('/api/courier/konum-gonder', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const data = readData();
        data.kuryeler[decoded.kuryeId].son_konum = req.body;
        data.kuryeler[decoded.kuryeId].son_guncelleme = new Date().toLocaleString();
        writeData(data);
        res.status(200).send({ message: "Konum kaydedildi" });
    } catch (err) { res.status(401).send({ message: "Oturum geçersiz" }); }
});

// 4. Tüm Kuryeleri Listele (Admin Tablosu İçin)
app.get('/api/admin/tum-kuryeler-ve-vardiya', (req, res) => {
    const data = readData();
    res.status(200).json(Object.values(data.kuryeler));
});

// 5. Duyuru Yayınla
app.post('/api/admin/duyuru-ekle', (req, res) => {
    const data = readData();
    data.duyuru = { ...req.body, tarih: { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 } };
    writeData(data);
    res.status(200).send({ message: "Duyuru yayınlandı" });
});

// 6. Duyuru Çek
app.get('/api/courier/duyuru-cek', (req, res) => {
    const data = readData();
    res.status(200).send({ duyuru: data.duyuru });
});

// 7. Vardiya İşlemleri
app.post('/api/courier/vardiya-giris', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const data = readData();
    data.kuryeler[decoded.kuryeId].aktif = true;
    data.kuryeler[decoded.kuryeId].giris_saati = { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
    writeData(data);
    res.status(200).send({ message: "Vardiya başladı" });
});

app.post('/api/courier/vardiya-cikis', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const data = readData();
    data.kuryeler[decoded.kuryeId].aktif = false;
    data.kuryeler[decoded.kuryeId].cikis_saati = { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
    writeData(data);
    res.status(200).send({ message: "Vardiya bitti" });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ÇALIŞIYOR: http://192.168.1.8:${PORT}`);
    console.log(`Veriler database.json dosyasına kaydediliyor (Firebase Gerekmez).`);
});