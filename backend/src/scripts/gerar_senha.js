// backend/gerar_senha.js
const bcrypt = require('bcryptjs');

// --- CONFIGURAÇÃO ---
const EMAIL = 'leonardo@empresa.com';
const NOVA_SENHA = 'piola52725'; // Digite a senha desejada aqui
// --------------------

async function gerar() {
    console.log("Gerando hash...");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(NOVA_SENHA, salt);
    
    console.log("\n--- COPIE E RODE ESTE COMANDO NO SEU BANCO DE DADOS ---");
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${EMAIL}';`);
    console.log("-------------------------------------------------------");
}

gerar();