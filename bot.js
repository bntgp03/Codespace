const {
    default: makeWASocket,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');

// --- (WAJIB DIISI) Masukkan nomor WhatsApp yang akan dijadikan bot ---
// Gunakan format kode negara, contoh: '6281234567890'
const NOMOR_BOT = '6289647417373';
// --------------------------------------------------------------------

async function connectTestWithPairingCode() {
    console.log('Mencoba memulai koneksi dengan Pairing Code...');

    // Validasi awal
    if (NOMOR_BOT === 'GANTI_DENGAN_NOMOR_BOT_ANDA' || !NOMOR_BOT) {
        console.error('❌ KESALAHAN: Harap isi variabel NOMOR_BOT di dalam file test_pairing.js');
        return;
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_test_session_pairing');

    const sock = makeWASocket({
        auth: state,
        browser: ['Tes Pairing Code', 'Safari', '1.0.0'],
        logger: require('pino')({ level: 'silent' }),
        // Fitur printQRInTerminal tidak diperlukan untuk pairing code
    });

    sock.ev.on('creds.update', saveCreds);

    // Meminta pairing code jika belum terhubung
    if (!sock.authState.creds.registered) {
        console.log(`Meminta Pairing Code untuk nomor: ${NOMOR_BOT}`);
        try {
            const code = await sock.requestPairingCode(NOMOR_BOT);
            console.log('------------------------------------------------');
            console.log('PAIRING CODE ANDA:');
            // Format kode agar lebih mudah dibaca (misal: XXXX-XXXX)
            console.log(`✅ ${code.slice(0, 4)}-${code.slice(4, 8)}`);
            console.log('------------------------------------------------');
            console.log('Buka WhatsApp di HP Anda > Setelan > Perangkat Tertaut > Tautkan dengan nomor telepon.');
        } catch (error) {
            console.error('❌ Gagal meminta pairing code:', error);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;

        if (connection === 'open') {
            console.log('✅✅✅ SELAMAT! Koneksi berhasil terbuka! ✅✅✅');
            console.log('Nomor Anda:', sock.user.id);
            console.log('Ini membuktikan bahwa metode Pairing Code bekerja dengan baik.');
        }

        if (connection === 'close') {
            console.log('❌ Koneksi terputus. Tes gagal pada tahap ini.');
        }
    });
}

// Jalankan tes
connectTestWithPairingCode();