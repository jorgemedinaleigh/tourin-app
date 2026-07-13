import { memo, useEffect, useMemo, useRef, useState } from "react"
import { FillLayer, LineLayer, ShapeSource } from "@maplibre/maplibre-react-native"
import { useGeoData } from "../contexts/GeoDataContext"
import { buildCirclePolygonCoordinates, getDistanceMeters } from "../utils/geo"
import { getEffectiveStampRadius } from "../utils/stampRadius"

const SOURCE_ID = "stamp-radius-source"
const FILL_LAYER_ID = "stamp-radius-fill"
const LINE_LAYER_ID = "stamp-radius-line"
const CIRCLE_SEGMENTS = 64
const STAMP_RADIUS_ANIMATION_MS = 650
const STAMP_RADIUS_REENTRY_COOLDOWN_MS = 5_000
const MIN_ANIMATED_RADIUS_M = 0.1
const EMPTY_RADIUS_DATA = Object.freeze({
  type: "FeatureCollection",
  features: [],
})

const fillStyle = {
  fillColor: "#22c55e",
  fillOpacity: 0.18,
}

const lineStyle = {
  lineColor: "#16a34a",
  lineOpacity: 0.85,
  lineWidth: 2,
}

const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3)

const getSiteKey = (feature, index, siteLat, siteLon) => {
  const id = feature.properties?.id ?? feature.id
  if (id !== undefined && id !== null && id !== "") return String(id)

  return `${siteLat}:${siteLon}:${index}`
}

function StampRadiusLayer({ userCoordinate, visitedSiteIds }) {
  const { geoData } = useGeoData()
  const [animatedRadii, setAnimatedRadii] = useState({})
  const previousEligibleSiteIdsRef = useRef(new Set())
  const lastAnimationAtRef = useRef({})
  const activeAnimationFramesRef = useRef({})

  const cancelAnimationForSite = (siteId) => {
    const frameId = activeAnimationFramesRef.current[siteId]
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId)
      delete activeAnimationFramesRef.current[siteId]
    }
  }

  const eligibleSites = useMemo(() => {
    if (!Array.isArray(userCoordinate) || userCoordinate.length !== 2) return null

    const [userLon, userLat] = userCoordinate
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) return null

    return (geoData?.features ?? []).map((feature, index) => {
      const coordinates = feature.geometry?.coordinates
      const [siteLon, siteLat] = Array.isArray(coordinates) ? coordinates : []
      const radius = Number(feature.properties?.stampRadius)

      if (
        !Number.isFinite(siteLat) ||
        !Number.isFinite(siteLon) ||
        !Number.isFinite(radius) ||
        radius <= 0
      ) {
        return null
      }

      const siteId = getSiteKey(feature, index, siteLat, siteLon)
      if (visitedSiteIds?.has(siteId)) return null

      const effectiveRadius = getEffectiveStampRadius(radius)
      if (!Number.isFinite(effectiveRadius)) return null

      const distance = getDistanceMeters(userLat, userLon, siteLat, siteLon)
      if (!Number.isFinite(distance) || distance > effectiveRadius) return null

      return {
        siteId,
        siteLat,
        siteLon,
        stampRadius: radius,
        effectiveRadius,
        distanceMeters: Math.round(distance),
      }
    }).filter(Boolean)
  }, [geoData, userCoordinate, visitedSiteIds])

  useEffect(() => {
    return () => {
      Object.values(activeAnimationFramesRef.current).forEach(cancelAnimationFrame)
      activeAnimationFramesRef.current = {}
    }
  }, [])

  useEffect(() => {
    if (!eligibleSites) {
      Object.values(activeAnimationFramesRef.current).forEach(cancelAnimationFrame)
      activeAnimationFramesRef.current = {}
      previousEligibleSiteIdsRef.current = new Set()
      setAnimatedRadii({})
      return
    }

    const now = Date.now()
    const nextEligibleSiteIds = new Set(eligibleSites.map((site) => site.siteId))
    const previousEligibleSiteIds = previousEligibleSiteIdsRef.current
    const exitedSiteIds = [...previousEligibleSiteIds].filter((siteId) => !nextEligibleSiteIds.has(siteId))

    exitedSiteIds.forEach(cancelAnimationForSite)

    if (exitedSiteIds.length) {
      setAnimatedRadii((current) => {
        const next = { ...current }
        exitedSiteIds.forEach((siteId) => {
          delete next[siteId]
        })
        return next
      })
    }

    const startAnimation = (site) => {
      cancelAnimationForSite(site.siteId)

      const startedAt = Date.now()
      lastAnimationAtRef.current[site.siteId] = startedAt
      setAnimatedRadii((current) => ({
        ...current,
        [site.siteId]: MIN_ANIMATED_RADIUS_M,
      }))

      const step = () => {
        if (!previousEligibleSiteIdsRef.current.has(site.siteId)) {
          delete activeAnimationFramesRef.current[site.siteId]
          return
        }

        const elapsedMs = Date.now() - startedAt
        const progress = Math.min(elapsedMs / STAMP_RADIUS_ANIMATION_MS, 1)

        if (progress >= 1) {
          delete activeAnimationFramesRef.current[site.siteId]
          setAnimatedRadii((current) => {
            const next = { ...current }
            delete next[site.siteId]
            return next
          })
          return
        }

        const visibleRadius = Math.max(
          MIN_ANIMATED_RADIUS_M,
          site.effectiveRadius * easeOutCubic(progress)
        )

        setAnimatedRadii((current) => ({
          ...current,
          [site.siteId]: visibleRadius,
        }))

        activeAnimationFramesRef.current[site.siteId] = requestAnimationFrame(step)
      }

      activeAnimationFramesRef.current[site.siteId] = requestAnimationFrame(step)
    }

    eligibleSites.forEach((site) => {
      if (previousEligibleSiteIds.has(site.siteId)) return

      const lastAnimationAt = lastAnimationAtRef.current[site.siteId] ?? 0
      const withinCooldown = now - lastAnimationAt < STAMP_RADIUS_REENTRY_COOLDOWN_MS

      if (!withinCooldown) {
        startAnimation(site)
      }
    })

    previousEligibleSiteIdsRef.current = nextEligibleSiteIds
  }, [eligibleSites])

  const radiusData = useMemo(() => {
    if (!eligibleSites) return null

    const features = eligibleSites.map((site) => {
      const animatedRadius = animatedRadii[site.siteId]
      const lastAnimationAt = lastAnimationAtRef.current[site.siteId] ?? 0
      const shouldStartAnimating =
        !previousEligibleSiteIdsRef.current.has(site.siteId) &&
        Date.now() - lastAnimationAt >= STAMP_RADIUS_REENTRY_COOLDOWN_MS
      const visibleRadius = Number.isFinite(animatedRadius) && animatedRadius > 0
        ? Math.min(animatedRadius, site.effectiveRadius)
        : (shouldStartAnimating ? MIN_ANIMATED_RADIUS_M : site.effectiveRadius)
      const ring = buildCirclePolygonCoordinates(site.siteLat, site.siteLon, visibleRadius, CIRCLE_SEGMENTS)
      if (!ring.length) return null

      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
        properties: {
          id: site.siteId,
          stampRadius: site.stampRadius,
          effectiveRadius: site.effectiveRadius,
          visibleRadius,
          distanceMeters: site.distanceMeters,
        },
      }
    }).filter(Boolean)

    if (!features.length) return EMPTY_RADIUS_DATA

    return {
      type: "FeatureCollection",
      features,
    }
  }, [animatedRadii, eligibleSites])

  if (!radiusData) return null

  return (
    <ShapeSource id={SOURCE_ID} shape={radiusData}>
      <FillLayer id={FILL_LAYER_ID} style={fillStyle} />
      <LineLayer id={LINE_LAYER_ID} style={lineStyle} />
    </ShapeSource>
  )
}

export default memo(StampRadiusLayer)
