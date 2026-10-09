// 00-validacion.js — Validación de entradas del usuario antes de enviarlas a Firebase.
// Las reglas de Firestore repiten los límites de tamaño en el servidor (firestore.rules);
// aquí se valida para dar un mensaje claro antes de intentar guardar.

const LIMITES_TEXTO={nombre:120,telefono:30,documento:30,especialidad:80,notas:5000};
const _CLAVES_COMUNES=["123456789","1234567890","password","contrasena","contraseña","qwerty","medico","hospital","mediasuite","abc123"];

// Contraseña del personal: mínimo 10 caracteres, con letras y números, y que no sea obvia.
// Devuelve el mensaje de error o "" si es válida.
function _validarClave(clave,{correo="",nombre=""}={}){
  const c=String(clave||"");
  if(c.length<10)return"La contraseña debe tener al menos 10 caracteres";
  if(c.length>128)return"La contraseña es demasiado larga";
  if(!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(c)||!/\d/.test(c))return"La contraseña debe combinar letras y números";
  const baja=c.toLowerCase();
  if(_CLAVES_COMUNES.some(x=>baja.includes(x)))return"Esa contraseña es muy fácil de adivinar";
  const usuario=String(correo).split("@")[0].toLowerCase();
  if(usuario.length>=4&&baja.includes(usuario))return"La contraseña no debe contener tu correo";
  const partes=String(nombre).toLowerCase().split(/\s+/).filter(p=>p.length>=4);
  if(partes.some(p=>baja.includes(p)))return"La contraseña no debe contener tu nombre";
  if(/^(.)\1+$/.test(c))return"La contraseña no puede repetir el mismo carácter";
  return"";
}

// Quita caracteres de control y espacios sobrantes, y recorta al largo máximo
function _limpiarTexto(v,max){
  return String(v??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").replace(/\s+/g," ").trim().slice(0,max);
}
function _telefonoValido(v){return/^\+?[0-9\s().-]{7,20}$/.test(String(v||"").trim());}

// Archivos: solo imágenes JPEG, PNG o WebP de hasta 10 MB. Se rechazan SVG (pueden llevar código),
// PDF, ejecutables y cualquier otro tipo. Las imágenes además se redibujan en un canvas antes de usarse.
const _TIPOS_IMAGEN=["image/jpeg","image/png","image/webp"];
function _imagenPermitida(file){
  if(!file)return"No se seleccionó ningún archivo";
  if(!_TIPOS_IMAGEN.includes(file.type))return"Solo se permiten fotos JPG, PNG o WebP";
  if(file.size>10*1024*1024)return"La foto pesa más de 10 MB";
  if(file.size<100)return"El archivo está vacío o dañado";
  return"";
}
