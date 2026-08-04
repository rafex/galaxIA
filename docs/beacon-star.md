# Beacon Star (proveedor LLM)

Un Star es el nodo de la red FHS que provee acceso a un modelo LLM. Se une al swarm P2P
publicando su Beacon Protobuf en la DHT y anunciándolo vía GossipSub (DEC-P2P-001).
La definición wire canónica está en `idl/fhs-protocol.proto`; el schema JSON es
solo validación documental.

## Ejemplo completo

```protobuf
Beacon {
  fhs_version: "1"
  provider: { id: "did:key:z...", type: PROVIDER_TYPE_STAR, visibility: VISIBILITY_COMMUNITY, name: "Mac mini de Raúl", region: "mx-cdmx" }
  endpoint: { multiaddr: "/ip4/192.168.3.173/tcp/8443/p2p/<peerId>" }
  models: { id: "qwen2.5-coder-3b", display_name: "Qwen 2.5 Coder 3B", capabilities: MODEL_CAPABILITY_CHAT, capabilities: MODEL_CAPABILITY_TOOL_CALLING, context_window: 4096, languages: "es", languages: "en", tool_calling: true }
  privacy: { retention: RETENTION_NONE, training_use: false }
  availability: { max_concurrent_requests: 2 }
}
```

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...`. Se genera con la clave privada del nodo — no es un nombre elegido a mano. El `handshake` y el `DhtBeaconRecord` se firman con esa clave.
- `provider.type`: siempre `"star"`.
- `provider.visibility`: acota en qué `scope` de `MissionOfferMessage` puede recibir bids — `"local"` / `"network"` / `"community"` / `"external"`.
- `endpoint.multiaddr`: Única dirección libp2p normativa para conexión P2P directa — publicada también en el `DhtBeaconRecord`. Los peers abren `/fhs/v1/0.1.0` mediante esta dirección.
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

- `idl/fhs-protocol.proto` — `Beacon` y `ModelDescriptor` wire
- `idl/fhs-protocol.proto` — definición Protobuf de `DhtBeaconRecord` y mensajes GossipSub
