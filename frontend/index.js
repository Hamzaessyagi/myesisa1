// Texte à écrire
const text = "BIENVENUE DANS VOTRE UNIVERSITE";
const target = document.getElementById("welcome-text");

// Si tu veux l'écrire lettre par lettre avec un effet JS au lieu de CSS :
document.addEventListener('DOMContentLoaded', function() {
  // Afficher le formulaire après l'animation
  setTimeout(function() {
    document.getElementById('loginForm').style.display = 'block';
  }, 4000); // Après 4 secondes
});
let index = 0;
function typeWriter() {
  if (index < text.length) {
    target.textContent += text.charAt(index);
    index++;
    setTimeout(typeWriter, 100); // Vitesse
  }
}
typeWriter();

