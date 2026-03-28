export const suggestedRoutes = [
  {
    id: 'centro-historico',
    title: 'Centro historico',
    subtitle: 'Plazas, museos y edificios para una primera caminata por la ciudad.',
    description:
      'Una ruta corta para ubicarse rapido, conocer puntos clasicos y moverse con calma entre hitos urbanos.',
    duration: '2 h',
    distance: '2.1 km',
    bestFor: 'Primera visita',
    color: '#B9654F',
    icon: 'business-outline',
    stops: ['Plaza central', 'Museo local', 'Mercado urbano'],
    pace: 'Suave',
    bestMoment: 'Manana o media tarde',
    highlights: ['Arquitectura clasica', 'Museos', 'Calles peatonales'],
    tip: 'Lleva agua y empieza temprano para recorrer con menos gente.',
    itinerary: [
      {
        name: 'Plaza central',
        description: 'Empieza aqui para ubicarte rapido y tomar el pulso del centro historico.',
      },
      {
        name: 'Museo local',
        description: 'Suma contexto a la ciudad y funciona bien como primera parada larga.',
      },
      {
        name: 'Mercado urbano',
        description: 'Cierra con comida, movimiento y un ambiente perfecto para descansar.',
      },
    ],
  },
  {
    id: 'arte-y-cafe',
    title: 'Arte y cafe',
    subtitle: 'Murales, galerias pequenas y una pausa para recargar energias.',
    description:
      'Ideal para una tarde relajada con paradas creativas, rincones fotogenicos y espacios para sentarse.',
    duration: '2.5 h',
    distance: '2.8 km',
    bestFor: 'Tarde tranquila',
    color: '#4E7C6D',
    icon: 'color-palette-outline',
    stops: ['Galeria barrial', 'Pasaje con murales', 'Cafe de autor'],
    pace: 'Relajado',
    bestMoment: 'Despues de almuerzo',
    highlights: ['Murales', 'Diseno local', 'Cafes pequenos'],
    tip: 'Reserva tiempo para entrar en galerias pequenas y quedarte un rato en el cafe.',
    itinerary: [
      {
        name: 'Galeria barrial',
        description: 'Abre la ruta con una parada creativa y una mirada mas local del barrio.',
      },
      {
        name: 'Pasaje con murales',
        description: 'Una caminata corta entre color, textura y buenos puntos para fotos.',
      },
      {
        name: 'Cafe de autor',
        description: 'Ideal para cerrar sin apuro y comentar lo mejor del recorrido.',
      },
    ],
  },
  {
    id: 'parques-y-miradores',
    title: 'Parques y miradores',
    subtitle: 'Aire libre, sombra y vistas abiertas para cerrar el dia.',
    description:
      'Pensada para quienes quieren caminar sin apuro, sumar descanso y terminar con una buena panoramica.',
    duration: '3 h',
    distance: '3.4 km',
    bestFor: 'Atardecer',
    color: '#5E759C',
    icon: 'leaf-outline',
    stops: ['Parque principal', 'Sendero arbolado', 'Mirador final'],
    pace: 'Sin apuro',
    bestMoment: 'Ultima hora de la tarde',
    highlights: ['Aire libre', 'Descanso', 'Vistas abiertas'],
    tip: 'Si el clima acompana, esta ruta funciona mejor cerca del atardecer.',
    itinerary: [
      {
        name: 'Parque principal',
        description: 'Empieza con un tramo verde para entrar en ritmo sin exigir demasiado.',
      },
      {
        name: 'Sendero arbolado',
        description: 'Continua por una zona tranquila y con buena sombra para caminar lento.',
      },
      {
        name: 'Mirador final',
        description: 'Termina con una vista abierta que vale la caminata completa.',
      },
    ],
  },
]

export const getSuggestedRouteById = (routeId) => {
  const normalizedRouteId = Array.isArray(routeId) ? routeId[0] : routeId
  return suggestedRoutes.find((route) => route.id === normalizedRouteId) || null
}
