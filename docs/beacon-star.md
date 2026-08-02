# Beacon Star (proveedor LLM)

Un Star es el nodo de la red FHS que provee acceso a un modelo LLM. Se une al swarm P2P
publicando su Beacon (manifiesto JSON) en la DHT y anunciándolo vía GossipSub (DEC-P2P-001).
El schema completo está en `schemas/beacon-star.schema.json`.

## Ejemplo completo

```json
{
  "fhsVersion": "1",
  "provider": {
    "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "name": "Mac mini de Raúl",
    "type": "star",
    "visibility": "community",
    "region": "mx-cdmx"
  },
  "endpoint": {
    "url": "wss://192.168.3.173:8081",
    "multiaddr": "/ip4/192.168.3.173/tcp/8081/ws"
  },
  "models": [
    {
      "id": "qwen2.5-coder-3b",
      "displayName": "Qwen 2.5 Coder 3B",
      "capabilities": ["chat", "tool_calling"],
      "contextWindow": 4096,
      "languages": ["es", "en"],
      "toolCalling": true
    }
  ],
  "privacy": {
    "retention": "none",
    "trainingUse": false
  },
  "availability": {
    "maxConcurrentRequests": 2
  }
}
```

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...`. Se genera con la clave privada del nodo — no es un nombre elegido a mano. El `handshake` y el `DhtBeaconRecord` se firman con esa clave.
- `provider.type`: siempre `"star"`.
- `provider.visibility`: acota en qué `scope` de `MissionOfferMessage` puede recibir bids — `"local"` / `"network"` / `"community"` / `"external"`.
- `endpoint.url`: WSS URL directa del Star (formato `^wss://`). Los peers abren el stream `/fhs/v1/0.1.0` contra esta URL.
- `endpoint.multiaddr`: Multiaddr libp2p para conexión P2P directa sin DNS — publicado también en el `DhtBeaconRecord`.
- `models[].capabilities`: `"chat"`, `"completion"`, `"embedding"`, `"vision"`, `"tool_calling"`.
- `models[].toolCalling`: `true` si el modelo puede invocar tools de forma nativa.
- `availability.maxConcurrentRequests`: misiones simultáneas máximas — si se supera, el Star no debe publicar bids.
- `privacy.trainingUse`: `true` si las conversaciones pueden usarse para fine-tuning. Nunca implícito.

## Cómo unirse al swarm P2P (DEC-P2P-001)

```
1. Conectar a bootstrap peer (Atlas u otro conocido)
2. Kademlia Join → publicar DhtBeaconRecord { did, beacon, multiaddrs, expiresAt, signature }
3. Suscribir a fhs/v1/nodes/advertise y fhs/v1/missions/*
4. Publicar NodeAdvertiseMessage cada 30s (TTL 60s)
5. Responder MissionOfferMessage con MissionBidMessage cuando se puede satisfacer la oferta
6. Si se recibe MissionAssignMessage con nuestro DID → aceptar stream directo /fhs/v1/0.1.0
```

Ver `protocol/p2p.md` y `idl/gossipsub.md` para el flujo completo.

## Referencia de schemas

- `schemas/beacon-star.schema.json` — schema completo del Beacon
- `idl/fhs-protocol.proto` — definición Protobuf de `DhtBeaconRecord` y mensajes GossipSub
