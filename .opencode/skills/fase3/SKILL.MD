Fase 2 — Datos Externos y Sistemas en Tiempo Real
Semana 3 — Dashboard de Audio de Spotify
Objetivo
Implementar una integración de OAuth orientada a producción y un dashboard responsivo
construido sobre datos de una API de terceros.
Concepto de producto
Construye un dashboard que cure playlists, podcasts o audiolibros. Un tema útil podría ser
mitología griega, estoicismo, filosofía, música clásica o aprendizaje técnico.Alcance del MVP
El usuario conecta una cuenta de Spotify mediante OAuth.
El backend maneja la redirección de autorización y el callback.
El material de tokens del usuario se almacena solo del lado del servidor.
La app muestra recursos seleccionados de Spotify, como playlists, episodios guardados o
elementos reproducidos recientemente.
Los datos de la API se cachean usando TanStack Query.
El manejo del refresh token no interrumpe las solicitudes normales del usuario.
División de estado recomendada
Estado
Propietario
Playlists, episodios y metadatos de álbumes de SpotifyTanStack Query
Estado de sincronización del backendTanStack Query
Token de OAuth y refresh tokenSolo servidor/base de datos
Panel actual, UI local de la cola, modo de visualización del reproductorSlice de Redux Toolkit si es necesario
Entrada de búsqueda antes de enviarlaEstado local del componente
Ejercicio de cacheo
Elige diferentes políticas de query según distintas necesidades de frescura:
Metadatos de playlist: staleTime más largo.
Contenido reproducido recientemente: staleTime más corto o refresco explícito.
UI similar a reproducción actual: comportamiento de polling/refetch solo si el producto lo
necesita.
Conocimiento a evaluar
Patrones de OAuth
Explica client credentials versus el flujo de authorization code.
Explica por qué client credentials no puede representar los datos privados de Spotify de un
usuario.
Explica el manejo seguro de la renovación del access token.
Explica por qué los tokens no deben estar en Redux, local storage o estado expuesto al
navegador.Resiliencia
Explica staleTime, cache time, refetching, reintentos y error boundaries.
Explica cómo evitar que una API de terceros lenta vuelva inutilizable todo el dashboard.
Definición de terminado
[ ] El callback de OAuth es manejado por una ruta de servidor pública.
[ ] Los tokens nunca se exponen al JavaScript del cliente.
[ ] Un usuario conectado ve datos de Spotify en caché.
[ ] El estado de UI del reproductor/layout está claramente separado del estado del servidor.
[ ] El PR, el diagrama y el documento de diseño están completos.