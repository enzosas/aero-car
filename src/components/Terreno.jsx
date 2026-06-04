import { useMemo } from 'react'
import * as THREE from 'three'

const ptcontrole = 10
const subdivisoes = 32
const espacamento = 140.0
const ondulacao = 140.0
const fatorborda = 0.3

const bboxmin = -(ptcontrole - 1) * espacamento / 2.0
const bboxmax = (ptcontrole - 1) * espacamento / 2.0

const numpatches = (ptcontrole - 1) / 3
export const pontostotal = numpatches * subdivisoes + 1

const controlpoints = []
const offsetx = bboxmin
const offsetz = bboxmin

for (let i = 0; i < ptcontrole; i++) {
    controlpoints[i] = []
    for (let j = 0; j < ptcontrole; j++) {
        const x = offsetx + i * espacamento
        const z = offsetz + j * espacamento
        let bordafactor = 1.0

        if (i === 0 || i === ptcontrole - 1 || j === 0 || j === ptcontrole - 1) {
            bordafactor = fatorborda
        }

        const y = (Math.random() - 0.5) * ondulacao * bordafactor
        controlpoints[i][j] = new THREE.Vector3(x, y, z)
    }
}

const bernstein = (i, t) => {
    if (i === 0) return (1 - t) ** 3
    if (i === 1) return 3 * t * ((1 - t) ** 2)
    if (i === 2) return 3 * (t ** 2) * (1 - t)
    if (i === 3) return t ** 3
    return 0
}

const avaliarbezierpatch = (patchi, patchj, u, v) => {
    const res = new THREE.Vector3(0, 0, 0)
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const idxi = patchi * 3 + i
            const idxj = patchj * 3 + j
            if (idxi < ptcontrole && idxj < ptcontrole) {
                const bu = bernstein(i, u)
                const bv = bernstein(j, v)
                const cp = controlpoints[idxi][idxj]
                res.add(new THREE.Vector3(
                    cp.x * bu * bv,
                    cp.y * bu * bv,
                    cp.z * bu * bv
                ))
            }
        }
    }
    return res
}

export const malha = []
for (let pi = 0; pi < numpatches; pi++) {
    for (let pj = 0; pj < numpatches; pj++) {
        for (let si = 0; si <= subdivisoes; si++) {
            for (let sj = 0; sj <= subdivisoes; sj++) {
                const u = si / subdivisoes
                const v = sj / subdivisoes
                const globali = pi * subdivisoes + si
                const globalj = pj * subdivisoes + sj

                if (!malha[globali]) malha[globali] = []
                malha[globali][globalj] = avaliarbezierpatch(pi, pj, u, v)
            }
        }
    }
}

export const obteralturaterrenoem = (x, z) => {
    const tamanho = malha.length
    if (tamanho === 0) return 0

    let tx = (x - bboxmin) / (bboxmax - bboxmin)
    let tz = (z - bboxmin) / (bboxmax - bboxmin)

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

    const h00 = malha[i][j].y
    const h10 = malha[i + 1][j].y
    const h01 = malha[i][j + 1].y
    const h11 = malha[i + 1][j + 1].y

    const h0 = h00 * (1.0 - fracaox) + h10 * fracaox
    const h1 = h01 * (1.0 - fracaox) + h11 * fracaox

    return h0 * (1.0 - fracaoz) + h1 * fracaoz
}

export const obternormalterrenoem = (x, z) => {
    const delta = 1.0
    const h0 = obteralturaterrenoem(x, z)
    const hx = obteralturaterrenoem(x + delta, z)
    const hz = obteralturaterrenoem(x, z + delta)

    const tx = new THREE.Vector3(delta, hx - h0, 0)
    const tz = new THREE.Vector3(0, hz - h0, delta)

    return new THREE.Vector3().crossVectors(tz, tx).normalize()
}

export default function Terreno() {
    const geometria = useMemo(() => {
        const vertices = []

        const addquad = (p1, p2, p3, p4) => {
            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p2.x, p2.y, p2.z)
            vertices.push(p3.x, p3.y, p3.z)

            vertices.push(p1.x, p1.y, p1.z)
            vertices.push(p3.x, p3.y, p3.z)
            vertices.push(p4.x, p4.y, p4.z)
        }

        for (let i = 0; i < pontostotal - 1; i++) {
            for (let j = 0; j < pontostotal - 1; j++) {
                const v00 = malha[i][j]
                const v10 = malha[i + 1][j]
                const v01 = malha[i][j + 1]
                const v11 = malha[i + 1][j + 1]

                addquad(v00, v10, v11, v01)
            }
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
        geo.computeVertexNormals()

        return geo
    }, [])

    return (
        <mesh geometry={geometria}>
            <meshStandardMaterial color="#baff4b" side={THREE.DoubleSide} opacity={0.6} transparent={true}/>
        </mesh>
    )
}