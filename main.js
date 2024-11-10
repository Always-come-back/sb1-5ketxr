import { Encryption } from './encryption.js';
import { NotificationManager } from './notifications.js';
import { api } from './api.js';

let users = [];
let messages = [];
let currentUser = null;
let selectedUser = null;
let encryption = null;
const notificationManager = new NotificationManager();

// Başlangıçta verileri yükle
async function loadInitialData() {
    try {
        users = await api.getUsers();
        messages = await api.getMessages();
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
    }
}

// Kullanıcı girişi
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const username = document.getElementById('loginUsername').value.trim();

    if (!email || !username) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }

    try {
        const allUsers = await api.getUsers();
        const user = allUsers.find(u => u.email === email && u.username === username);
        
        if (!user) {
            alert('Kullanıcı bulunamadı veya bilgiler hatalı!');
            return;
        }

        currentUser = user;
        encryption = new Encryption();
        currentUser.publicKey = encryption.getPublicKey();
        showUserSelectScreen();
    } catch (error) {
        alert('Giriş yapılırken bir hata oluştu!');
        console.error(error);
    }
}

// Kayıt ekranına geç
function showRegisterScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.remove('hidden');
    // Kayıt formunu temizle
    document.getElementById('username').value = '';
    document.getElementById('email').value = '';
}

// Giriş ekranına geç
function showLoginScreen() {
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    // Giriş formunu temizle
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginEmail').value = '';
}

// Kullanıcı kaydı
async function registerUser() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!username || !email) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }

    if (!email.includes('@')) {
        alert('Geçerli bir e-posta adresi girin!');
        return;
    }

    try {
        const allUsers = await api.getUsers();
        if (allUsers.some(user => user.username === username || user.email === email)) {
            alert('Bu kullanıcı adı veya e-posta zaten kullanılıyor!');
            return;
        }

        encryption = new Encryption();
        const newUser = { 
            username, 
            email,
            publicKey: encryption.getPublicKey()
        };

        await api.createUser(newUser);
        alert('Kayıt başarılı! Lütfen giriş yapın.');
        
        // Kayıt formunu temizle ve giriş ekranına geç
        document.getElementById('username').value = '';
        document.getElementById('email').value = '';
        
        // Giriş formunu önceden doldur
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginEmail').value = email;
        
        showLoginScreen();
    } catch (error) {
        alert('Kayıt olurken bir hata oluştu!');
        console.error(error);
    }
}

// Kullanıcı seçim ekranını göster
async function showUserSelectScreen() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('userSelectScreen').classList.remove('hidden');
    
    try {
        const allUsers = await api.getUsers();
        const userList = document.getElementById('userList');
        userList.innerHTML = '<option value="">Kullanıcı Seçin</option>';
        
        allUsers.forEach(user => {
            if (user.username !== currentUser.username) {
                const option = document.createElement('option');
                option.value = user.username;
                option.textContent = user.username;
                userList.appendChild(option);
            }
        });
    } catch (error) {
        alert('Kullanıcı listesi yüklenirken bir hata oluştu!');
        console.error(error);
    }
}

// Sohbeti başlat
async function startChat() {
    const selectedUsername = document.getElementById('userList').value;
    if (!selectedUsername) {
        alert('Lütfen bir kullanıcı seçin!');
        return;
    }

    try {
        const allUsers = await api.getUsers();
        selectedUser = allUsers.find(user => user.username === selectedUsername);
        document.getElementById('userSelectScreen').classList.add('hidden');
        document.getElementById('chatScreen').classList.remove('hidden');
        document.getElementById('chatWith').textContent = selectedUser.username;
        
        loadMessages();
    } catch (error) {
        alert('Sohbet başlatılırken bir hata oluştu!');
        console.error(error);
    }
}

// Kullanıcı seçimine geri dön
function backToUserSelect() {
    document.getElementById('chatScreen').classList.add('hidden');
    document.getElementById('userSelectScreen').classList.remove('hidden');
    document.getElementById('messageArea').innerHTML = '';
    selectedUser = null;
}

// Mesaj gönder
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (!messageText) return;
    
    try {
        // Mesajı şifrele
        const encryptedText = encryption.encrypt(messageText, selectedUser.publicKey);
        
        const message = {
            from: currentUser.username,
            to: selectedUser.username,
            text: encryptedText,
            timestamp: new Date().toISOString()
        };
        
        await api.createMessage(message);
        messages.push(message);
        
        displayMessage({...message, text: messageText}); // Görüntüleme için şifresiz metni kullan
        input.value = '';
    } catch (error) {
        alert('Mesaj gönderilirken bir hata oluştu!');
        console.error(error);
    }
}

// Mesajları yükle
async function loadMessages() {
    try {
        const allMessages = await api.getMessages();
        const messageArea = document.getElementById('messageArea');
        messageArea.innerHTML = '';
        
        const chatMessages = allMessages.filter(msg => 
            (msg.from === currentUser.username && msg.to === selectedUser.username) ||
            (msg.from === selectedUser.username && msg.to === currentUser.username)
        );
        
        chatMessages.forEach(msg => {
            const decryptedMsg = {...msg};
            if (msg.from === currentUser.username) {
                decryptedMsg.text = encryption.decrypt(msg.text, selectedUser.publicKey);
            } else {
                decryptedMsg.text = encryption.decrypt(msg.text, selectedUser.publicKey);
            }
            displayMessage(decryptedMsg);
        });
    } catch (error) {
        alert('Mesajlar yüklenirken bir hata oluştu!');
        console.error(error);
    }
}

// Mesajı görüntüle
function displayMessage(message) {
    const messageArea = document.getElementById('messageArea');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(message.from === currentUser.username ? 'sent' : 'received');
    messageDiv.textContent = message.text;
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;

    // Gelen mesaj bildirimi
    if (message.from !== currentUser.username) {
        notificationManager.sendNotification('Yeni Mesaj', {
            body: `${message.from}: ${message.text}`,
            tag: 'chat-message'
        });
    }
}

// Enter tuşu ile mesaj gönderme
document.getElementById('messageInput')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Sayfa yüklendiğinde verileri yükle
document.addEventListener('DOMContentLoaded', loadInitialData);

// Global fonksiyonları tanımla
window.loginUser = loginUser;
window.showRegisterScreen = showRegisterScreen;
window.showLoginScreen = showLoginScreen;
window.registerUser = registerUser;
window.startChat = startChat;
window.backToUserSelect = backToUserSelect;
window.sendMessage = sendMessage;