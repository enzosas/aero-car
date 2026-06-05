import { useMemo } from 'react'
import * as THREE from 'three'

export const TerrenoState = {
    malha: [],
    bboxmin: 0,
    bboxmax: 0,
    pontostotal: 0
}

const bernstein = (i, t) => {
    if (i === 0) return (1 - t) ** 3
    if (i === 1) return 3 * t * ((1 - t) ** 2)
    if (i === 2) return 3 * (t ** 2) * (1 - t)
    if (i === 3) return t ** 3
    return 0
}

const avaliarbezierpatch = (controlpoints, ptcontrole, patchi, patchj, u, v) => {
    const res = new THREE.Vector3(0, 0, 0)
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const idxi = patchi * 3 + i
            const idxj = patchj * 3 + j
            if (idxi < ptcontrole && idxj < ptcontrole) {
                const bu = bernstein(i, u)
                const bv = bernstein(j, v)
                const cp = controlpoints[idxi][idxj]
                if (cp) {
                    res.add(new THREE.Vector3(
                        cp.x * bu * bv,
                        cp.y * bu * bv,
                        cp.z * bu * bv
                    ))
                }
            }
        }
    }
    return res
}

const getPseudoRandom = (i, j) => {
    const dot = i * 12.9898 + j * 78.233;
    const sn = Math.sin(dot) * 43758.5453;
    return sn - Math.floor(sn);
}

export const atualizarMatrizTerreno = (params) => {
    if (!params) return;

    const ptcontrole = Math.max(4, Math.floor(params.ptcontrole))
    const subdivisoes = Math.max(1, Math.floor(params.subdivisoes))
    const espacamento = params.espacamento
    const ondulacao = params.ondulacao
    const fatorborda = params.fatorborda

    TerrenoState.bboxmin = -(ptcontrole - 1) * espacamento / 2.0
    TerrenoState.bboxmax = (ptcontrole - 1) * espacamento / 2.0

    const numpatches = Math.floor((ptcontrole - 1) / 3)
    TerrenoState.pontostotal = numpatches * subdivisoes + 1

    const controlpoints = []
    const offsetx = TerrenoState.bboxmin
    const offsetz = TerrenoState.bboxmin

    for (let i = 0; i < ptcontrole; i++) {
        controlpoints[i] = []
        for (let j = 0; j < ptcontrole; j++) {
            const x = offsetx + i * espacamento
            const z = offsetz + j * espacamento
            let bordafactor = 1.0

            if (i === 0 || i === ptcontrole - 1 || j === 0 || j === ptcontrole - 1) {
                bordafactor = fatorborda
            }

            const y = (getPseudoRandom(i, j) - 0.5) * ondulacao * bordafactor
            controlpoints[i][j] = new THREE.Vector3(x, y, z)
        }
    }

    const novaMalha = []
    for (let pi = 0; pi < numpatches; pi++) {
        for (let pj = 0; pj < numpatches; pj++) {
            for (let si = 0; si <= subdivisoes; si++) {
                for (let sj = 0; sj <= subdivisoes; sj++) {
                    const u = si / subdivisoes
                    const v = sj / subdivisoes
                    const globali = pi * subdivisoes + si
                    const globalj = pj * subdivisoes + sj

                    if (!novaMalha[globali]) novaMalha[globali] = []
                    novaMalha[globali][globalj] = avaliarbezierpatch(controlpoints, ptcontrole, pi, pj, u, v)
                }
            }
        }
    }

    TerrenoState.malha = novaMalha;
}

export const obteralturaterrenoem = (x, z) => {
    const malha = TerrenoState.malha;
    const tamanho = malha.length
    if (tamanho === 0) return 0

    let tx = (x - TerrenoState.bboxmin) / (TerrenoState.bboxmax - TerrenoState.bboxmin)
    let tz = (z - TerrenoState.bboxmin) / (TerrenoState.bboxmax - TerrenoState.bboxmin)

    if (tx < 0.0) tx = 0.0
    if (tx > 1.0) tx = 1.0
    if (tz < 0.0) tz = 0.0
    if (tz > 1.0) tz = 1.0

    const fx = tx * (tamanho - 1)
    const fz = tz * (tamanho - 1)

    let i = Math.floor(fx)
    let j = Math.floor(fz)

    if (i >= tamanho - 1) i = tamanho - 2
    if (j >= tamanho - 1) j = tamanho - 2

    const fracaox = fx - i
    const fracaoz = fz - j

    const h00 = malha[i]?.[j]?.y || 0
    const h10 = malha[i + 1]?.[j]?.y || 0
    const h01 = malha[i]?.[j + 1]?.y || 0
    const h11 = malha[i + 1]?.[j + 1]?.y || 0

    const h0 = h00 * (1.0 - fracaox) + h10 * fracaox
    const h1 = h01 * (1.0 - fracaox) + h11 * fracaox

    return h0 * (1.0 - fracaoz) + h1 * fracaoz
}

export const obternormalterrenoem = (x, z) => {
    const delta = 0.1
    const h0 = obteralturaterrenoem(x, z)
    const hx = obteralturaterrenoem(x + delta, z)
    const hz = obteralturaterrenoem(x, z + delta)

    const tx = new THREE.Vector3(delta, hx - h0, 0)
    const tz = new THREE.Vector3(0, hz - h0, delta)

    return new THREE.Vector3().crossVectors(tz, tx).normalize()
}

export default function Terreno({ config }) {
    const geometria = useMemo(() => {
        const params = config?.parametros;

        if (params) {
            atualizarMatrizTerreno(params);
        }

        const vertices = []

        const addquad = (p1, p2, p3, p4) => {
            if (!p1 || !p2 || !p3 || !p4) return;
            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p2.x, p2.y, p2.z)
            vertices.push(p3.x, p3.y, p3.z)

            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p3.x, p3.y, p3.z)
            vertices.push(p4.x, p4.y, p4.z)
        }

        for (let i = 0; i < TerrenoState.pontostotal - 1; i++) {
            for (let j = 0; j < TerrenoState.pontostotal - 1; j++) {
                if (TerrenoState.malha[i] && TerrenoState.malha[i + 1]) {
                    const v00 = TerrenoState.malha[i][j]
                    const v10 = TerrenoState.malha[i + 1][j]
                    const v01 = TerrenoState.malha[i][j + 1]
                    const v11 = TerrenoState.malha[i + 1][j + 1]

                    addquad(v00, v10, v11, v01)
                }
            }
        }

        const geo = new THREE.BufferGeometry()
        if (vertices.length > 0) {
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
            geo.computeVertexNormals()
        }

        return geo
    }, [config])

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color="#baff4b" side={THREE.DoubleSide} opacity={config.visualizacao.fatorOpacidade} transparent={true} />
        </mesh>
    )
}