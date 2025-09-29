// Impor library yang dibutuhkan
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

// --- PENGATURAN ---
// 1. Ganti nomor ini dengan nomor WhatsApp tujuan Anda.
//    Format: [kode negara][nomor telepon]@s.whatsapp.net
//    Contoh: '6281234567890@s.whatsapp.net' (tanpa tanda + atau 0 di depan)
const NOMOR_TUJUAN = '6289647417373@s.whatsapp.net';

// 2. Atur pesan pengingat yang ingin Anda kirim
const PESAN_PENGINGAT = '💧 Waktunya minum air putih! Jangan lupa jaga hidrasi ya. 💧';

// 3. Atur interval pengingat dalam milidetik.
//    10 menit = 10 * 60 * 1000 = 600000 milidetik
const INTERVAL_PENGINGAT = 10 * 60 * 1000;
// --- AKHIR PENGATURAN ---

// Variabel untuk menyimpan interval agar bisa dihentikan jika perlu
let reminderInterval;

async function connectToWhatsApp() {
    // Menyimpan sesi otentikasi agar tidak perlu scan QR terus-menerus
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // Membuat koneksi ke WhatsApp
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }) // 'silent' agar tidak terlalu banyak log di terminal
    });

    // Listener untuk event koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('------------------------------------------------');
            console.log('Pindai QR code ini dengan aplikasi WhatsApp Anda.');
            console.log('Caranya: Buka WhatsApp > Setelan > Perangkat Tertaut > Tautkan Perangkat');
            console.log('------------------------------------------------');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut :
                true;

            console.log('Koneksi terputus karena:', lastDisconnect.error, ', mencoba menghubungkan kembali:', shouldReconnect);

            if (shouldReconnect) {
                // Hentikan interval lama jika ada
                if (reminderInterval) clearInterval(reminderInterval);
                // Coba hubungkan kembali
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Koneksi berhasil terbuka!');
            console.log(`Bot akan mengirim pengingat minum ke nomor ${NOMOR_TUJUAN} setiap 10 menit.`);

            // Mulai pengingat setelah koneksi berhasil
            startReminder(sock);
        }
    });

    // Listener untuk menyimpan kredensial/sesi
    sock.ev.on('creds.update', saveCreds);

    // Fungsi untuk memulai pengingat
    function startReminder(socket) {
        // Pastikan tidak ada interval ganda yang berjalan
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

// Jalankan bot
connectToWhatsApp();