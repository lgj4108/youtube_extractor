export const EQ_BANDS = [
    { key: 'hz60', frequency: 60, label: '60 Hz', description: 'Sub' },
    { key: 'hz150', frequency: 150, label: '150 Hz', description: 'Bass' },
    { key: 'hz400', frequency: 400, label: '400 Hz', description: 'Low mid' },
    { key: 'hz1k', frequency: 1_000, label: '1 kHz', description: 'Body' },
    { key: 'hz2_5k', frequency: 2_500, label: '2.5 kHz', description: 'Detail' },
    { key: 'hz6k', frequency: 6_000, label: '6 kHz', description: 'Presence' },
    { key: 'hz12k', frequency: 12_000, label: '12 kHz', description: 'Air' },
] as const;

export type EqBandKey = typeof EQ_BANDS[number]['key'];
export type EqSettings = Record<EqBandKey, number>;

export interface MasteringSettings {
    compression: number;
    deEsser: number;
    drive: number;
    eq: EqSettings;
    outputGain: number;
    stereoWidth: number;
}

export interface MasteringPreset {
    description: string;
    label: string;
    settings: MasteringSettings;
}

export const MASTERING_PRESETS = {
    CLEAN: {
        label: '클린 밸런스',
        description: '원본의 성격을 유지하면서 피크와 저역만 정돈합니다.',
        settings: { compression: 20, deEsser: 10, drive: 0, stereoWidth: 0, outputGain: 0, eq: { hz60: 0, hz150: 0, hz400: -0.5, hz1k: 0, hz2_5k: 0.5, hz6k: 0, hz12k: 0.5 } },
    },
    POP_PUNCH: {
        label: '팝 펀치',
        description: '킥과 보컬의 존재감을 살리는 현대적인 팝 밸런스입니다.',
        settings: { compression: 58, deEsser: 26, drive: 10, stereoWidth: 22, outputGain: 0, eq: { hz60: 2.5, hz150: 1, hz400: -1.5, hz1k: 0.5, hz2_5k: 1.8, hz6k: 1.5, hz12k: 2 } },
    },
    HIPHOP_WEIGHT: {
        label: '힙합 웨이트',
        description: '서브와 드럼 무게를 확보하고 중역 혼탁함을 줄입니다.',
        settings: { compression: 65, deEsser: 18, drive: 13, stereoWidth: 8, outputGain: -0.5, eq: { hz60: 3.5, hz150: 1.8, hz400: -1.2, hz1k: -0.3, hz2_5k: 0.8, hz6k: 0.5, hz12k: 0.5 } },
    },
    EDM_WIDE: {
        label: 'EDM 와이드',
        description: '저역 중심을 유지하면서 상단과 스테레오 이미지를 확장합니다.',
        settings: { compression: 70, deEsser: 20, drive: 12, stereoWidth: 45, outputGain: -0.8, eq: { hz60: 2.8, hz150: 0.5, hz400: -2, hz1k: -0.5, hz2_5k: 1.8, hz6k: 2.2, hz12k: 2.5 } },
    },
    LOFI_WARM: {
        label: '로파이 웜',
        description: '폭을 좁히고 고역을 부드럽게 눌러 따뜻한 질감을 만듭니다.',
        settings: { compression: 35, deEsser: 38, drive: 28, stereoWidth: -30, outputGain: -1, eq: { hz60: 1, hz150: 2, hz400: 1.5, hz1k: 0.8, hz2_5k: -1, hz6k: -2.5, hz12k: -4 } },
    },
} satisfies Record<string, MasteringPreset>;

export type PresetKey = keyof typeof MASTERING_PRESETS;

export const DEFAULT_MASTERING_SETTINGS = cloneSettings(MASTERING_PRESETS.CLEAN.settings);

export function cloneSettings(settings: MasteringSettings): MasteringSettings {
    return { ...settings, eq: { ...settings.eq } };
}

function dbToGain(db: number) {
    return 10 ** (db / 20);
}

function setParam(param: AudioParam, value: number, time: number, immediate: boolean) {
    param.cancelScheduledValues(time);
    if (immediate) param.setValueAtTime(value, time);
    else param.setTargetAtTime(value, time, 0.015);
}

function makeSaturationCurve(amount: number) {
    const curve = new Float32Array(32_768);
    const strength = Math.max(0, amount) / 4;
    for (let index = 0; index < curve.length; index += 1) {
        const input = (index * 2) / (curve.length - 1) - 1;
        curve[index] = ((1 + strength) * input) / (1 + strength * Math.abs(input));
    }
    return curve;
}

export interface MasteringGraph {
    compressor: DynamicsCompressorNode;
    deEsser: BiquadFilterNode;
    dryGain: GainNode;
    eqFilters: BiquadFilterNode[];
    makeupGain: GainNode;
    nodes: AudioNode[];
    outputGain: GainNode;
    saturation: WaveShaperNode;
    source: AudioBufferSourceNode;
    wetGain: GainNode;
    widthGains: [GainNode, GainNode, GainNode, GainNode] | null;
}

export function updateMasteringGraph(
    graph: MasteringGraph,
    settings: MasteringSettings,
    time: number,
    bypass: boolean,
    immediate = false,
) {
    graph.saturation.curve = makeSaturationCurve(settings.drive);
    setParam(graph.deEsser.gain, -(settings.deEsser / 100) * 7, time, immediate);
    graph.eqFilters.forEach((filter, index) => {
        const band = EQ_BANDS[index];
        setParam(filter.gain, settings.eq[band.key], time, immediate);
    });

    const compression = settings.compression / 100;
    setParam(graph.compressor.threshold, -5 - compression * 23, time, immediate);
    setParam(graph.compressor.knee, 6 + compression * 16, time, immediate);
    setParam(graph.compressor.ratio, 1 + compression * 5, time, immediate);
    setParam(graph.compressor.attack, 0.03 - compression * 0.024, time, immediate);
    setParam(graph.compressor.release, 0.18 + compression * 0.12, time, immediate);
    setParam(graph.makeupGain.gain, dbToGain(compression * 3.5), time, immediate);
    setParam(graph.outputGain.gain, dbToGain(settings.outputGain), time, immediate);

    if (graph.widthGains) {
        const width = 1 + settings.stereoWidth / 100;
        const sameChannel = (1 + width) / 2;
        const crossChannel = (1 - width) / 2;
        const [leftToLeft, rightToLeft, leftToRight, rightToRight] = graph.widthGains;
        setParam(leftToLeft.gain, sameChannel, time, immediate);
        setParam(rightToLeft.gain, crossChannel, time, immediate);
        setParam(leftToRight.gain, crossChannel, time, immediate);
        setParam(rightToRight.gain, sameChannel, time, immediate);
    }

    setParam(graph.dryGain.gain, bypass ? 1 : 0, time, immediate);
    setParam(graph.wetGain.gain, bypass ? 0 : 1, time, immediate);
}

export function buildMasteringGraph(
    context: BaseAudioContext,
    buffer: AudioBuffer,
    settings: MasteringSettings,
    bypass = false,
): MasteringGraph {
    const source = context.createBufferSource();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const highPass = context.createBiquadFilter();
    const deEsser = context.createBiquadFilter();
    const saturation = context.createWaveShaper();
    const compressor = context.createDynamicsCompressor();
    const makeupGain = context.createGain();
    const outputGain = context.createGain();
    const limiter = context.createDynamicsCompressor();
    const nodes: AudioNode[] = [source, dryGain, wetGain, highPass, deEsser, saturation, compressor, makeupGain, outputGain, limiter];

    source.buffer = buffer;
    highPass.type = 'highpass';
    highPass.frequency.value = 28;
    highPass.Q.value = 0.7;
    deEsser.type = 'highshelf';
    deEsser.frequency.value = 6_500;
    saturation.oversample = '4x';

    const eqFilters = EQ_BANDS.map((band, index) => {
        const filter = context.createBiquadFilter();
        filter.type = index === 0 ? 'lowshelf' : index === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = band.frequency;
        filter.Q.value = index === 0 || index === EQ_BANDS.length - 1 ? 0.7 : 1;
        nodes.push(filter);
        return filter;
    });

    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;

    source.connect(dryGain);
    dryGain.connect(context.destination);
    source.connect(highPass);
    highPass.connect(deEsser);
    deEsser.connect(saturation);

    let currentNode: AudioNode = saturation;
    for (const filter of eqFilters) {
        currentNode.connect(filter);
        currentNode = filter;
    }
    currentNode.connect(compressor);
    compressor.connect(makeupGain);

    const merger = context.createChannelMerger(2);
    nodes.push(merger);
    let widthGains: MasteringGraph['widthGains'] = null;

    if (buffer.numberOfChannels > 1) {
        const splitter = context.createChannelSplitter(2);
        const leftToLeft = context.createGain();
        const rightToLeft = context.createGain();
        const leftToRight = context.createGain();
        const rightToRight = context.createGain();
        widthGains = [leftToLeft, rightToLeft, leftToRight, rightToRight];
        nodes.push(splitter, ...widthGains);

        makeupGain.connect(splitter);
        splitter.connect(leftToLeft, 0);
        splitter.connect(rightToLeft, 1);
        splitter.connect(leftToRight, 0);
        splitter.connect(rightToRight, 1);
        leftToLeft.connect(merger, 0, 0);
        rightToLeft.connect(merger, 0, 0);
        leftToRight.connect(merger, 0, 1);
        rightToRight.connect(merger, 0, 1);
    } else {
        const monoLeft = context.createGain();
        const monoRight = context.createGain();
        nodes.push(monoLeft, monoRight);
        makeupGain.connect(monoLeft);
        makeupGain.connect(monoRight);
        monoLeft.connect(merger, 0, 0);
        monoRight.connect(merger, 0, 1);
    }

    merger.connect(outputGain);
    outputGain.connect(limiter);
    limiter.connect(wetGain);
    wetGain.connect(context.destination);

    const graph: MasteringGraph = {
        compressor,
        deEsser,
        dryGain,
        eqFilters,
        makeupGain,
        nodes,
        outputGain,
        saturation,
        source,
        wetGain,
        widthGains,
    };
    updateMasteringGraph(graph, settings, context.currentTime, bypass, true);
    return graph;
}

export function disconnectMasteringGraph(graph: MasteringGraph, stopSource = true) {
    graph.source.onended = null;
    if (stopSource) {
        try {
            graph.source.stop();
        } catch {
            // 이미 종료된 one-shot source는 다시 정지할 수 없습니다.
        }
    }
    graph.nodes.forEach((node) => node.disconnect());
}

export interface AudioStats {
    channels: number;
    duration: number;
    peakDb: number;
    sampleRate: number;
}

export function analyzeAudioBuffer(buffer: AudioBuffer): AudioStats {
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const samples = buffer.getChannelData(channel);
        for (let index = 0; index < samples.length; index += 1) {
            peak = Math.max(peak, Math.abs(samples[index]));
        }
    }
    return {
        channels: buffer.numberOfChannels,
        duration: buffer.duration,
        peakDb: peak > 0 ? 20 * Math.log10(peak) : Number.NEGATIVE_INFINITY,
        sampleRate: buffer.sampleRate,
    };
}

function writeAscii(view: DataView, offset: number, value: string) {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

export function audioBufferToWav(
    buffer: AudioBuffer,
    options: { bitDepth: 16 | 24; normalize: boolean; targetPeakDb?: number },
) {
    const channelCount = Math.min(2, buffer.numberOfChannels);
    const bytesPerSample = options.bitDepth / 8;
    const dataSize = buffer.length * channelCount * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    const targetPeak = dbToGain(options.targetPeakDb ?? -1);
    const stats = analyzeAudioBuffer(buffer);
    const currentPeak = Number.isFinite(stats.peakDb) ? dbToGain(stats.peakDb) : 0;
    const normalizationGain = options.normalize && currentPeak > 0
        ? Math.min(4, targetPeak / currentPeak)
        : 1;

    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * channelCount * bytesPerSample, true);
    view.setUint16(32, channelCount * bytesPerSample, true);
    view.setUint16(34, options.bitDepth, true);
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
        for (let channel = 0; channel < channelCount; channel += 1) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[sampleIndex] * normalizationGain));
            if (options.bitDepth === 16) {
                view.setInt16(offset, sample < 0 ? Math.round(sample * 32_768) : Math.round(sample * 32_767), true);
                offset += 2;
            } else {
                const value = sample < 0 ? Math.round(sample * 8_388_608) : Math.round(sample * 8_388_607);
                view.setUint8(offset, value & 0xff);
                view.setUint8(offset + 1, (value >> 8) & 0xff);
                view.setUint8(offset + 2, (value >> 16) & 0xff);
                offset += 3;
            }
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}
