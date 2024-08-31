const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Mock de dados
const users = [
  {"username" : "user", "password" : "123456", "id" : 123, "email" : "user@dominio.com", "perfil": "user"},
  {"username" : "admin", "password" : "123456789", "id" : 124, "email" : "admin@dominio.com", "perfil": "admin"},
  {"username" : "colab", "password" : "123", "id" : 125, "email" : "colab@dominio.com", "perfil": "user"},
];

// Chave para criptografia
const secretKey = crypto.createHash('sha256').update('nomedaempresa').digest().slice(0, 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

function decrypt(encryptedText) {
  console.log(`EncryptedText: ${encryptedText}`);
  const [ivHex, encryptedData] = encryptedText.split(':');
  console.log(`IV: ${ivHex}, Encrypted Data: ${encryptedData}`); 

  if (!ivHex || ivHex.length !== 32) {
    throw new Error('Invalid IV length');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

function doLogin(credentials) {
  return users.find(item => {
    return credentials?.username === item.username && credentials?.password === item.password;
  });
};

function getPerfil(sessionId) {
  const user = JSON.parse(decrypt(sessionId));
  const userData = users.find(item => parseInt(user.usuario_id) === parseInt(item.id));
  return userData?.perfil;
}

// Endpoints da API
app.post('/api/auth/login', (req, res) => {
  const credentials = req.body;
  const userData = doLogin(credentials);

  if (userData) {
    const dataToEncrypt = `{"usuario_id":${userData.id}}`;
    const hashString = encrypt(dataToEncrypt);
    console.log(`Generated Session ID: ${hashString}`);
    res.json({ sessionid: hashString });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/auth/decrypt/:sessionid', (req, res) => {
  try {
    const sessionid = req.params.sessionid;
    const decryptedSessionid = decrypt(sessionid);
    res.json({ decryptedSessionid });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/:sessionid', (req, res) => {
  try {
    const sessionid = req.params.sessionid;
    const perfil = getPerfil(sessionid);

    if (perfil !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      res.status(200).json({ data: users });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/contracts/:empresa/:inicio/:sessionid', (req, res) => {
  try {
    const empresa = req.params.empresa;
    const dtInicio = req.params.inicio;
    const sessionid = req.params.sessionid;
    const result = getContracts(empresa, dtInicio); 

    if (result) {
      res.status(200).json({ data: result });
    } else {
      res.status(404).json({ data: 'Dados Não encontrados' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Classe fake emulando um script externo, responsável pela execução de queries no banco de dados
class Repository {
  execute(query) {
    return [];
  }
};

// Recupera, no banco de dados, os dados dos contratos
function getContracts(empresa, inicio) {
  const repository = new Repository();
  const query = `Select * from contracts Where empresa = '${empresa}' And data_inicio = '${inicio}'`;
  const result = repository.execute(query);
  return result;
};

