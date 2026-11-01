# Nova 💜

Nova es tu IA personal. Vive en tu dispositivo y funciona **sin internet**.

**Abrir / instalar:** https://wilmergc17-arch.github.io/nova/

## Cómo instalarla en el celular (Android)
1. Abre el enlace de arriba en **Chrome**, con Wi-Fi.
2. Menú ⋮ → **Agregar a la pantalla principal** (o "Instalar app").
3. Abre Nova desde el ícono y elige su cerebro (**Recomendado**). Se descarga una sola vez.
4. Listo: desde ahí funciona aunque no haya internet.

## Dónde se guarda cada parte
| Parte | Dónde vive | Cómo llevarla a otro equipo |
|---|---|---|
| La app | En el teléfono (se guarda sola al abrirla) | Abre el mismo enlace en la laptop / ROG Ally, o copia esta carpeta |
| El cerebro (modelo, archivo `.gguf`) | Almacenamiento privado de la app | Menú → **Guardar cerebro en archivo**; en el otro equipo: **Cargar cerebro desde archivo** |
| La memoria (lo que sabe de ti) | Base de datos del navegador, en el teléfono | Menú → **Exportar memoria** (`nova-memoria-AAAA-MM-DD.json`); en el otro equipo: **Importar memoria** |

El cerebro y la memoria están separados: puedes cambiar de cerebro sin que Nova olvide nada.

## Usarla sin internet en una computadora (desde una USB)
Copia esta carpeta completa a la USB. En la computadora, dentro de la carpeta:
```
python -m http.server 8000
```
y abre http://localhost:8000 en Chrome o Edge. (Hace falta Python; no se necesita internet.)

## Partes del código
- `app.js` – pantalla de chat, personalidad de Nova y aprendizaje.
- `memory.js` – memoria local (recuerdos, conversación, horarios de uso para aprender rutinas).
- `brain.js` – motor de IA local ([wllama](https://github.com/ngxson/wllama), licencia MIT, en `vendor/`).
- `web.js` – búsqueda opcional en Wikipedia cuando hay internet.
- `sw.js` – hace que la app abra sin conexión.

Próximos pasos: voz, aprender rutinas, y que Nova te hable por iniciativa propia.
