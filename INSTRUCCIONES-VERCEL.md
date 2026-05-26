# Publicar en GitHub y Vercel

Esta carpeta es la version para publicar:

`publicar-github-vercel`

No subas la carpeta como una carpeta adentro del repo. Entra adentro de esta carpeta y subi su contenido.

## 1. Crear repo nuevo en GitHub

1. Entra a GitHub.
2. Toca `+`.
3. Toca `New repository`.
4. Nombre sugerido: `analizador-deportivo-real`.
5. Elegi `Public`.
6. No marques README.
7. No marques .gitignore.
8. Toca `Create repository`.

## 2. Subir archivos

1. En el repo nuevo, toca `uploading an existing file`.
2. Abri esta carpeta:

`C:\Users\Joaco\Documents\Codex\2026-05-26\quiero-crear-una-aplicaci-n-web\publicar-github-vercel`

3. Entra adentro.
4. Selecciona todo lo que esta adentro.
5. Arrastralo a GitHub.
6. Toca `Commit changes`.

En GitHub tienen que quedar en la raiz:

- `api`
- `data`
- `docs`
- `src`
- `index.html`
- `styles.css`
- `package.json`
- `vercel.json`
- `README.md`

## 3. Crear proyecto en Vercel

1. Entra a Vercel.
2. Toca `Add New`.
3. Toca `Project`.
4. Importa el repo nuevo.
5. Framework Preset: `Other`.
6. Build Command: dejar vacio.
7. Output Directory: dejar vacio.
8. Install Command: dejar vacio.

## 4. Agregar API key en Vercel

Antes de hacer deploy, agrega una variable:

- Name: `API_FOOTBALL_KEY`
- Value: tu API key

No pongas la API key dentro del codigo.

## 5. Probar

Despues del deploy, abri:

`https://TU-WEB.vercel.app/api/football-fixtures`

Si ves JSON con partidos, la API funciona.

Despues abri:

`https://TU-WEB.vercel.app/`

Si algo aparece viejo, proba con Ctrl + F5.
