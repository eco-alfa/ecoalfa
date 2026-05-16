# Despliegue Ecoalfa en GitHub Pages

## 1. Preparar Firebase

1. En Firebase Authentication, activa Email/Password.
2. Crea el primer usuario administrador.
3. Copia el `uid` del usuario.
4. En Firestore crea `users/{uid}` con:

```js
{
  email: "admin@ecoalfa.com",
  displayName: "Administrador Ecoalfa",
  role: "admin",
  active: true
}
```

5. Publica el contenido de `firestore.rules` en Firestore Rules.
6. Agrega el dominio de GitHub Pages en Authentication > Settings > Authorized domains.

## 2. Subir a GitHub

1. Crea un repositorio en GitHub.
2. Sube todo el contenido de la carpeta `Ecoalfa`.
3. Verifica que existan `index.html` y `.nojekyll` en la raíz del repositorio.

## 3. Activar GitHub Pages

1. Entra al repositorio en GitHub.
2. Ve a Settings > Pages.
3. En Source selecciona Deploy from a branch.
4. Selecciona la rama `main` y carpeta `/root`.
5. Guarda y espera la URL pública.

## 4. Pruebas mínimas

- Login con usuario admin.
- Crear perfil de usuario por UID en Usuarios.
- Crear cita.
- Crear paciente e historia clínica.
- Crear medicamento.
- Facturar medicamento y verificar descuento de stock.
- Revisar dashboard.

## 5. Notas de Firestore Spark

- El sistema usa `getDocs()` y consultas limitadas por defecto.
- No usa listeners permanentes `onSnapshot()`.
- Si Firestore solicita índices compuestos, créalos desde el enlace automático de la consola.

## 6. Si el login no avanza en GitHub Pages

- Verifica que Email/Password esté habilitado en Firebase Authentication.
- Verifica que el usuario exista en Authentication y que estés usando la contraseña correcta.
- Agrega el dominio de GitHub Pages en Authentication > Settings > Authorized domains.
- Crea el documento `users/{uid}` en Firestore usando exactamente el UID del usuario autenticado.
- El documento debe tener un `role` válido: `admin`, `medico`, `operador` o `asesor`.
- El documento debe tener `active: true` como booleano, no como texto.
- Publica `firestore.rules` después de cambiar reglas.
