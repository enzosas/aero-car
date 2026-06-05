import { useMemo } from 'react'
import * as THREE from 'three'
import { GramadoInstanced } from './Grama'

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

export const gerarPosicaoRandomTerreno = () => {
    const { bboxmin, bboxmax } = TerrenoState;
    if (bboxmin === bboxmax) return new THREE.Vector3(0, 0, 0);
    const x = bboxmin + Math.random() * (bboxmax - bboxmin);
    const z = bboxmin + Math.random() * (bboxmax - bboxmin);
    const y = obteralturaterrenoem(x, z);
    return new THREE.Vector3(x, y, z);
}
export const gerarUmaArvore = (id, arvoresparams) => {
    const posicao = gerarPosicaoRandomTerreno();
    if (!posicao) return null;
    const alturaTronco = arvoresparams.alturaTronco + Math.random() * arvoresparams.alturaTroncoRandExtra;
    const raioTronco = arvoresparams.raioTronco + Math.random() * arvoresparams.raioTroncoRandExtra;
    const incMax = arvoresparams.inclinacaoMax;
    const inclinacaoX = (Math.random() - 0.5) * incMax;
    const inclinacaoZ = (Math.random() - 0.5) * incMax;
    const segTronco = arvoresparams.segmentosTronco || 7;
    const geometriaTronco = new THREE.CylinderGeometry(raioTronco * 0.7, raioTronco, alturaTronco, segTronco);
    geometriaTronco.translate(0, alturaTronco / 2, 0);
    geometriaTronco.rotateX(inclinacaoX);
    geometriaTronco.rotateZ(inclinacaoZ);
    const geometriasCopa = [];
    const geometriasGalho = [];
    const minEsferas = arvoresparams.copaMinEsferas;
    const extraEsferas = arvoresparams.copaMaxExtraEsferas;
    const numEsferas = minEsferas + Math.floor(Math.random() * (extraEsferas + 1));
    for (let i = 0; i < numEsferas; i++) {
        const raioEsfera = arvoresparams.raioEsfera + Math.random() * arvoresparams.raioEsferaRandExtra;
        const segEsfera = arvoresparams.segmentosEsfera || 8;
        const esfera = new THREE.SphereGeometry(raioEsfera, segEsfera, segEsfera);
        const baseEscala = arvoresparams.escalaCopaBase;
        const randEscala = arvoresparams.escalaCopaRand;
        const escalaX = baseEscala[0] + Math.random() * randEscala[0];
        const escalaY = baseEscala[1] + Math.random() * randEscala[1];
        const escalaZ = baseEscala[2] + Math.random() * randEscala[2];
        esfera.scale(escalaX, escalaY, escalaZ);
        const espalhamento = arvoresparams.espalhamentoCopa;
        const offsetX = i === 0 ? 0 : (Math.random() - 0.5) * espalhamento;
        const offsetZ = i === 0 ? 0 : (Math.random() - 0.5) * espalhamento;
        const offsetY = alturaTronco + (Math.random() * arvoresparams.offsetYCopaRand) + raioEsfera / 2;
        esfera.translate(offsetX, offsetY, offsetZ);
        esfera.rotateX(inclinacaoX);
        esfera.rotateZ(inclinacaoZ);
        geometriasCopa.push(esfera);
        if (i !== 0) {
            const minBase = arvoresparams.galhoAlturaMinBaseRatio;
            const randExtra = arvoresparams.galhoAlturaRatioRandExtra;
            const startY = (alturaTronco * minBase) + (Math.random() * (alturaTronco * randExtra));
            const start = new THREE.Vector3(0, startY, 0);
            const end = new THREE.Vector3(offsetX, offsetY, offsetZ);
            const distance = start.distanceTo(end);
            const raioBaseGalho = raioTronco * arvoresparams.galhoRaioBaseRatio;
            const raioPontaGalho = raioTronco * arvoresparams.galhoRaioPontaRatio;
            const segGalho = arvoresparams.segmentosGalho || 5;
            const galho = new THREE.CylinderGeometry(raioPontaGalho, raioBaseGalho, distance, segGalho);
            const direction = new THREE.Vector3().subVectors(end, start).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
            galho.applyQuaternion(quaternion);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            galho.translate(mid.x, mid.y, mid.z);
            galho.rotateX(inclinacaoX);
            galho.rotateZ(inclinacaoZ);
            geometriasGalho.push(galho);
        }
    }
    return {
        id: id,
        posicao: posicao,
        geometriaTronco: geometriaTronco,
        geometriasGalho: geometriasGalho,
        geometriasCopa: geometriasCopa
    };
}

export const gerarArvoresAleatorias = (arvoresparams) => {
    const arvores = [];
    if (!arvoresparams) return arvores;

    for (let i = 0; i < arvoresparams.quantidade; i++) {
        const novaArvore = gerarUmaArvore(i, arvoresparams);
        if (novaArvore) {
            arvores.push(novaArvore);
        }
    }
    return arvores;
}


export const ArvoreMesh = ({ arvore }) => {
    return (
        <group position={[arvore.posicao.x, arvore.posicao.y, arvore.posicao.z]}>
            <mesh geometry={arvore.geometriaTronco}>
                <meshStandardMaterial color="#795c47" />
            </mesh>
            {arvore.geometriasGalho.map((geometriaGalho, index) => (
                <mesh key={`galho-${index}`} geometry={geometriaGalho}>
                    <meshStandardMaterial color="#795c47" />
                </mesh>
            ))}
            {arvore.geometriasCopa.map((geometriaEsfera, index) => (
                <mesh key={index} geometry={geometriaEsfera}>
                    <meshStandardMaterial color="#baff4b" opacity={1} transparent={true} />
                </mesh>
            ))}
        </group>
    );
}

const gerarGramado = () => {
    const gramas = [];
    for (let i = 0; i < 10000; i++) {
        const posicao = gerarPosicaoRandomTerreno();
        const normal = obternormalterrenoem(posicao.x, posicao.z);
        gramas.push({
            id: i,
            posicao: posicao,
            normal: normal
        });
    }
    return gramas;
}

export default function Terreno({ config, arvconfig }) {

    const { geometria, arvoresGeradas, gramasGeradas } = useMemo(() => {
        const params = config?.parametros;
        const arvoreparams = arvconfig?.arvores;

        if (params) {
            atualizarMatrizTerreno(params);
        }

        const vertices = [];

        const addquad = (p1, p2, p3, p4) => {
            if (!p1 || !p2 || !p3 || !p4) return;
            vertices.push(p1.x, p1.y, p1.z);
            vertices.push(p2.x, p2.y, p2.z);
            vertices.push(p3.x, p3.y, p3.z);

            vertices.push(p1.x, p1.y, p1.z);
            vertices.push(p3.x, p3.y, p3.z);
            vertices.push(p4.x, p4.y, p4.z);
        };

        for (let i = 0; i < TerrenoState.pontostotal - 1; i++) {
            for (let j = 0; j < TerrenoState.pontostotal - 1; j++) {
                if (TerrenoState.malha[i] && TerrenoState.malha[i + 1]) {
                    const v00 = TerrenoState.malha[i][j];
                    const v10 = TerrenoState.malha[i + 1][j];
                    const v01 = TerrenoState.malha[i][j + 1];
                    const v11 = TerrenoState.malha[i + 1][j + 1];

                    addquad(v00, v10, v11, v01);
                }
            }
        }

        const geo = new THREE.BufferGeometry();
        if (vertices.length > 0) {
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            geo.computeVertexNormals();
        }

        const arvores = arvoreparams ? gerarArvoresAleatorias(arvoreparams) : [];
        const gramas = gerarGramado();

        return {
            geometria: geo,
            arvoresGeradas: arvores,
            gramasGeradas: gramas
        };
    }, [config, arvconfig]);

    return (
        <group>
            <mesh geometry={geometria}>
                <meshStandardMaterial
                    color="#baff4b"
                    side={THREE.DoubleSide}
                    opacity={config?.visualizacao?.fatorOpacidade || 1}
                    transparent={true}
                />
            </mesh>
            {arvoresGeradas.map((arvore) => (
                <ArvoreMesh key={arvore.id} arvore={arvore} />
            ))}
            <GramadoInstanced gramas={gramasGeradas} />
        </group>
    );
}