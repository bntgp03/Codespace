const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const QRCode = require('qrcode'); // 1. Impor library qrcode

// --- PENGATURAN ---
const NOMOR_BOT = '6289647417373';
const NOMOR_TUJUAN = '6289647417373@s.whatsapp.net';
const PESAN_PENGINGAT = '💧 Waktunya minum air putih! Jangan lupa jaga hidrasi ya. 💧';
const INTERVAL_PENGINGAT = 10 * 60 * 1000;
// --- AKHIR PENGATURAN ---

let reminderInterval;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        // Hapus `printQRInTerminal: false` agar event 'qr' bisa ditangkap
        browser: Browsers.macOS('Desktop'),
        logger: pino({ level: 'silent' })
    });

    // Logika Pairing Code hanya untuk koneksi pertama kali
    if (!sock.authState.creds.registered) {
        if (!NOMOR_BOT) {
            console.log('❌ Harap isi NOMOR_BOT di dalam file bot.js');
            return;
        }
        
        console.log(`Meminta Pairing Code untuk nomor: ${NOMOR_BOT}`);
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(NOMOR_BOT);
                console.log('------------------------------------------------');
                console.log('PAIRING CODE ANDA:');
                console.log(`✅ ${code.slice(0, 4)}-${code.slice(4, 8)}`);
                console.log('------------------------------------------------');
                console.log('Buka WhatsApp > Setelan > Perangkat Tertaut > Tautkan dengan nomor telepon.');
            } catch (error) {
                console.error('Gagal meminta pairing code:', error);
            }
        }, 3000);
    }

    // 2. Modifikasi event 'connection.update' untuk menangani QR code
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update; // Ambil 'qr' dari update

        // Jika ada QR code, tampilkan di terminal
        if (qr) {
            console.log('------------------------------------------------');
            console.log('Silakan pindai QR Code di bawah ini:');
            console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
            console.log('------------------------------------------------');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            console.log('Koneksi terputus:', lastDisconnect.error, ', menghubungkan kembali:', shouldReconnect);
            if (shouldReconnect) {
                if (reminderInterval) clearInterval(reminderInterval);
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Koneksi berhasil terbuka!');
            console.log(`Bot akan mengirim pengingat ke ${NOMOR_TUJUAN} setiap 10 menit.`);
            startReminder(sock);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    function startReminder(socket) {
        if (reminderInterval) clearInterval(reminderInterval);
        reminderInterval = setInterval(async () => {
            try {
                console.log(`Mengirim pengingat ke ${NOMOR_TUJUAN}...`);
                await socket.sendMessage(NOMOR_TUJUAN, { text: PESAN_PENGINGAT });
                console.log('Pesan berhasil terkirim!');
            } catch (error) {
                console.error('Gagal mengirim pesan:', error);
            }
        }, INTERVAL_PENGINGAT);
    }
}

// 3. Pastikan Anda sudah menginstal library qrcode
// Jalankan perintah ini di terminal jika belum: npm install qrcode
connectToWhatsApp();