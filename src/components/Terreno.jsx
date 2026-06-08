import { useMemo, useRef, useEffect } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import texturaTerrenoUrl from '../assets/texturagrama.png'
import texturaGramaUrl from '../assets/grama.png'
import texturaarvore1 from '../assets/tree1.png'
import texturaarvore2 from '../assets/tree2.png'
import texturaarvore3 from '../assets/tree3.png'
import texturaarvore4 from '../assets/tree4.png'
import texturaarvore5 from '../assets/tree5.png'
import texturaMoitaUrl from '../assets/moita.png'

const imagensArvores = [texturaarvore1, texturaarvore2, texturaarvore3, texturaarvore4, texturaarvore5];

export const TerrenoState = {
    malha: [],
    bboxmin: 0,
    bboxmax: 0,
    pontostotal: 0
}

const getPseudoRandom = (i, j) => {
    const dot = i * 12.9898 + j * 78.233;
    const sn = Math.sin(dot) * 43758.5453;
    return sn - Math.floor(sn);
}

const bsplineBase = (i, t) => {
    if (i === 0) return (1.0 - t) ** 3 / 6.0;
    if (i === 1) return (3.0 * t ** 3 - 6.0 * t ** 2 + 4.0) / 6.0;
    if (i === 2) return (-3.0 * t ** 3 + 3.0 * t ** 2 + 3.0 * t + 1.0) / 6.0;
    if (i === 3) return (t ** 3) / 6.0;
    return 0;
}

const avaliarBsplinePatch = (controlpoints, pi, pj, u, v) => {
    const res = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const bu = bsplineBase(i, u);
            const bv = bsplineBase(j, v);
            const cp = controlpoints[pi + i][pj + j];
            if (cp) {
                res.add(new THREE.Vector3(
                    cp.x * bu * bv,
                    cp.y * bu * bv,
                    cp.z * bu * bv
                ));
            }
        }
    }
    return res;
}

export const atualizarMatrizTerreno = (params) => {
    if (!params) return;
    const ptcontrole = Math.max(4, Math.floor(params.ptcontrole));
    const subdivisoes = Math.max(1, Math.floor(params.subdivisoes));
    const espacamento = params.espacamento;
    const ondulacao = params.ondulacao;
    const fatorborda = params.fatorborda;
    const numpatches = ptcontrole - 3;
    const numVertices = numpatches * subdivisoes + 1;
    TerrenoState.pontostotal = numVertices;
    const controlpoints = [];
    const offsetx = -(ptcontrole - 1) * espacamento / 2.0;
    const offsetz = -(ptcontrole - 1) * espacamento / 2.0;
    for (let i = 0; i < ptcontrole; i++) {
        controlpoints[i] = [];
        for (let j = 0; j < ptcontrole; j++) {
            const x = offsetx + i * espacamento;
            const z = offsetz + j * espacamento;
            let bordafactor = 1.0;
            if (i < 2 || i >= ptcontrole - 2 || j < 2 || j >= ptcontrole - 2) {
                bordafactor = fatorborda;
            }
            const y = (getPseudoRandom(i, j) - 0.5) * ondulacao * bordafactor;
            controlpoints[i][j] = new THREE.Vector3(x, y, z);
        }
    }
    const novaMalha = [];
    for (let i = 0; i < numVertices; i++) {
        novaMalha[i] = [];
    }
    for (let pi = 0; pi < numpatches; pi++) {
        for (let pj = 0; pj < numpatches; pj++) {
            for (let si = 0; si <= subdivisoes; si++) {
                for (let sj = 0; sj <= subdivisoes; sj++) {
                    const u = si / subdivisoes;
                    const v = sj / subdivisoes;
                    const globali = pi * subdivisoes + si;
                    const globalj = pj * subdivisoes + sj;
                    if (!novaMalha[globali][globalj]) {
                        novaMalha[globali][globalj] = avaliarBsplinePatch(controlpoints, pi, pj, u, v);
                    }
                }
            }
        }
    }
    TerrenoState.malha = novaMalha;
    if (novaMalha.length > 0 && novaMalha[0].length > 0) {
        TerrenoState.bboxmin = novaMalha[0][0].x;
        TerrenoState.bboxmax = novaMalha[numVertices - 1][numVertices - 1].x;
    }
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

    const tamanhoBase = arvoresparams.alturaTronco + arvoresparams.raioEsfera;
    const tamanho = tamanhoBase + Math.random() * arvoresparams.alturaTroncoRandExtra;

    const texturaIndex = Math.floor(Math.random() * 5);

    return {
        id: id,
        posicao: posicao,
        tamanho: tamanho,
        texturaIndex: texturaIndex
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


const GrupoArvores = ({ textura, arvores }) => {
    const meshRef1 = useRef()
    const meshRef2 = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const geometriaBase = useMemo(() => new THREE.PlaneGeometry(1, 1), [])

    useEffect(() => {
        if (!meshRef1.current || !meshRef2.current) return
        arvores.forEach((arvore, i) => {
            const yAtual = arvore.posicao.y + arvore.tamanho / 2
            dummy.position.set(arvore.posicao.x, yAtual, arvore.posicao.z)
            dummy.rotation.set(0, 0, 0)
            dummy.scale.set(arvore.tamanho, arvore.tamanho, 1)
            dummy.updateMatrix()
            meshRef1.current.setMatrixAt(i, dummy.matrix)
            dummy.rotation.set(0, Math.PI / 2, 0)
            dummy.updateMatrix()
            meshRef2.current.setMatrixAt(i, dummy.matrix)
        })
        meshRef1.current.instanceMatrix.needsUpdate = true
        meshRef2.current.instanceMatrix.needsUpdate = true
    }, [arvores, dummy])

    if (arvores.length === 0) return null

    return (
        <group>
            <instancedMesh ref={meshRef1} args={[geometriaBase, undefined, arvores.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
            <instancedMesh ref={meshRef2} args={[geometriaBase, undefined, arvores.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
        </group>
    )
}

export const ArvoresInstanced = ({ arvores, texturas }) => {
    return (
        <group>
            {texturas.map((textura, index) => {
                const arvoresDestaTextura = arvores.filter(a => a.texturaIndex === index)

                return (
                    <GrupoArvores
                        key={`grupo-arvore-${index}`}
                        textura={textura}
                        arvores={arvoresDestaTextura}
                    />
                )
            })}
        </group>
    )
}

export const GramadoInstanced = ({ gramas, textura, gramaconfig }) => {
    const meshRef1 = useRef()
    const meshRef2 = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const geometriaBase = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.translate(0, 0.5, 0)
        return geo
    }, [])
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const qNormal = useMemo(() => new THREE.Quaternion(), [])
    const qRot = useMemo(() => new THREE.Quaternion(), [])

    useEffect(() => {
        if (!meshRef1.current || !meshRef2.current) return

        const alturaBase = gramaconfig?.grama?.altura || 6.0
        const larguraBase = (gramaconfig?.grama?.raio || 2.0) * 2

        gramas.forEach((grama, i) => {
            const fatorDispersao = getPseudoRandom(grama.posicao.x, grama.posicao.z)
            const escalaAleatoria = 0.6 + fatorDispersao * 0.8

            const largura = larguraBase * escalaAleatoria
            const altura = alturaBase * escalaAleatoria

            dummy.position.set(grama.posicao.x, grama.posicao.y, grama.posicao.z)

            const rotacaoAleatoria = fatorDispersao * Math.PI

            if (grama.normal) {
                qNormal.setFromUnitVectors(up, grama.normal)

                qRot.setFromAxisAngle(up, rotacaoAleatoria)
                dummy.quaternion.copy(qNormal).multiply(qRot)
                dummy.scale.set(largura, altura, 1)
                dummy.updateMatrix()
                meshRef1.current.setMatrixAt(i, dummy.matrix)

                qRot.setFromAxisAngle(up, rotacaoAleatoria + Math.PI / 2)
                dummy.quaternion.copy(qNormal).multiply(qRot)
                dummy.scale.set(largura, altura, 1)
                dummy.updateMatrix()
                meshRef2.current.setMatrixAt(i, dummy.matrix)
            }
        })

        meshRef1.current.instanceMatrix.needsUpdate = true
        meshRef2.current.instanceMatrix.needsUpdate = true
    }, [gramas, gramaconfig, dummy, up, qNormal, qRot])

    if (gramas.length === 0) return null

    return (
        <group>
            <instancedMesh ref={meshRef1} args={[geometriaBase, undefined, gramas.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
            <instancedMesh ref={meshRef2} args={[geometriaBase, undefined, gramas.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
        </group>
    )
}

const gerarGramado = (gramaparams) => {
    const gramas = [];
    for (let i = 0; i < gramaparams.quantidade; i++) {
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

export const MoitasInstanced = ({ moitas, textura, moitaconfig }) => {
    const meshRef1 = useRef()
    const meshRef2 = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const geometriaBase = useMemo(() => {
        const geo = new THREE.PlaneGeometry(1, 1)
        geo.translate(0, 0.5, 0)
        return geo
    }, [])
    const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
    const qNormal = useMemo(() => new THREE.Quaternion(), [])
    const qRot = useMemo(() => new THREE.Quaternion(), [])

    useEffect(() => {
        if (!meshRef1.current || !meshRef2.current) return

        const alturaBase = moitaconfig?.moita?.altura || 12.0
        const larguraBase = (moitaconfig?.moita?.raio || 6.0) * 2

        moitas.forEach((moita, i) => {
            const fatorDispersao = getPseudoRandom(moita.posicao.x, moita.posicao.z)
            const escalaAleatoria = 0.6 + fatorDispersao * 0.8

            const largura = larguraBase * escalaAleatoria
            const altura = alturaBase * escalaAleatoria

            dummy.position.set(moita.posicao.x, moita.posicao.y, moita.posicao.z)

            const rotacaoAleatoria = fatorDispersao * Math.PI

            if (moita.normal) {
                qNormal.setFromUnitVectors(up, moita.normal)

                qRot.setFromAxisAngle(up, rotacaoAleatoria)
                dummy.quaternion.copy(qNormal).multiply(qRot)
                dummy.scale.set(largura, altura, 1)
                dummy.updateMatrix()
                meshRef1.current.setMatrixAt(i, dummy.matrix)

                qRot.setFromAxisAngle(up, rotacaoAleatoria + Math.PI / 2)
                dummy.quaternion.copy(qNormal).multiply(qRot)
                dummy.scale.set(largura, altura, 1)
                dummy.updateMatrix()
                meshRef2.current.setMatrixAt(i, dummy.matrix)
            }
        })

        meshRef1.current.instanceMatrix.needsUpdate = true
        meshRef2.current.instanceMatrix.needsUpdate = true
    }, [moitas, moitaconfig, dummy, up, qNormal, qRot])

    if (moitas.length === 0) return null

    return (
        <group>
            <instancedMesh ref={meshRef1} args={[geometriaBase, undefined, moitas.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
            <instancedMesh ref={meshRef2} args={[geometriaBase, undefined, moitas.length]} frustumCulled={false}>
                <meshBasicMaterial map={textura} color="white" alphaTest={0.5} side={THREE.DoubleSide} transparent={true} />
            </instancedMesh>
        </group>
    )
}

const gerarMoitas = (moitaparams) => {
    const moitas = [];
    if (!moitaparams) return moitas;
    for (let i = 0; i < moitaparams.quantidade; i++) {
        const posicao = gerarPosicaoRandomTerreno();
        const normal = obternormalterrenoem(posicao.x, posicao.z);
        moitas.push({
            id: i,
            posicao: posicao,
            normal: normal
        });
    }
    return moitas;
}

export default function Terreno({ config, arvconfig, gramaconfig, moitaconfig }) {

    const textura = useLoader(THREE.TextureLoader, texturaTerrenoUrl)
    textura.wrapS = THREE.RepeatWrapping
    textura.wrapT = THREE.RepeatWrapping
    textura.colorSpace = THREE.SRGBColorSpace

    const texturasArvores = useLoader(THREE.TextureLoader, imagensArvores)
    texturasArvores.forEach(tex => {
        tex.colorSpace = THREE.SRGBColorSpace
    })
    
    const texturaGrama = useLoader(THREE.TextureLoader, texturaGramaUrl)
    texturaGrama.colorSpace = THREE.SRGBColorSpace

    const texturaMoita = useLoader(THREE.TextureLoader, texturaMoitaUrl)
    texturaMoita.colorSpace = THREE.SRGBColorSpace

    const { geometria, arvoresGeradas, gramasGeradas, moitasGeradas } = useMemo(() => {
        const params = config?.parametros;
        const arvoreparams = arvconfig?.arvores;
        const gramaparams = gramaconfig?.grama;
        const moitaparams = moitaconfig?.moita;

        if (params) {
            atualizarMatrizTerreno(params);
        }

        const vertices = [];
        const uvs = [];

        const addquad = (p1, p2, p3, p4, uv1, uv2, uv3, uv4) => {
            if (!p1 || !p2 || !p3 || !p4) return;
            vertices.push(p1.x, p1.y, p1.z);
            vertices.push(p2.x, p2.y, p2.z);
            vertices.push(p3.x, p3.y, p3.z);
            uvs.push(uv1.u, uv1.v, uv2.u, uv2.v, uv3.u, uv3.v);

            vertices.push(p1.x, p1.y, p1.z);
            vertices.push(p3.x, p3.y, p3.z);
            vertices.push(p4.x, p4.y, p4.z);
            uvs.push(uv1.u, uv1.v, uv3.u, uv3.v, uv4.u, uv4.v);
        };

        const repeticoesTex = 200.0;

        for (let i = 0; i < TerrenoState.pontostotal - 1; i++) {
            for (let j = 0; j < TerrenoState.pontostotal - 1; j++) {
                if (TerrenoState.malha[i] && TerrenoState.malha[i + 1]) {
                    const v00 = TerrenoState.malha[i][j];
                    const v10 = TerrenoState.malha[i + 1][j];
                    const v01 = TerrenoState.malha[i][j + 1];
                    const v11 = TerrenoState.malha[i + 1][j + 1];

                    const uv00 = { u: (i / TerrenoState.pontostotal) * repeticoesTex, v: (j / TerrenoState.pontostotal) * repeticoesTex };
                    const uv10 = { u: ((i + 1) / TerrenoState.pontostotal) * repeticoesTex, v: (j / TerrenoState.pontostotal) * repeticoesTex };
                    const uv01 = { u: (i / TerrenoState.pontostotal) * repeticoesTex, v: ((j + 1) / TerrenoState.pontostotal) * repeticoesTex };
                    const uv11 = { u: ((i + 1) / TerrenoState.pontostotal) * repeticoesTex, v: ((j + 1) / TerrenoState.pontostotal) * repeticoesTex };

                    addquad(v00, v10, v11, v01, uv00, uv10, uv11, uv01);
                }
            }
        }

        const geo = new THREE.BufferGeometry();
        if (vertices.length > 0) {
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
            geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
            geo.computeVertexNormals();
        }

        const arvores = arvoreparams ? gerarArvoresAleatorias(arvoreparams) : [];
        const gramas = gerarGramado(gramaparams);
        const moitas = gerarMoitas(moitaparams);

        return {
            geometria: geo,
            arvoresGeradas: arvores,
            gramasGeradas: gramas,
            moitasGeradas: moitas
        };
    }, [config, arvconfig, gramaconfig, moitaconfig]);

    return (
        <group>
            <mesh geometry={geometria}>
                <meshBasicMaterial
                    map={textura}
                    color="white"
                    side={THREE.DoubleSide}
                    opacity={config?.visualizacao?.fatorOpacidade || 1}
                    transparent={true}
                />
            </mesh>
            <ArvoresInstanced
                arvores={arvoresGeradas}
                texturas={texturasArvores}
            />
            <GramadoInstanced
                gramas={gramasGeradas}
                textura={texturaGrama}
                gramaconfig={gramaconfig}
            />
            <MoitasInstanced
                moitas={moitasGeradas}
                textura={texturaMoita}
                moitaconfig={moitaconfig}
            />
        </group>
    );
}