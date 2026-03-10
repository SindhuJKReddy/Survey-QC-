export class DefaultXAxisConfiguration {
    type: any = 'value';
    min: number | null = NaN;
    max: number | null = NaN;
    interval: number | null = NaN;
    name: string = '';
    minorTick: {
        show: boolean,
        splitNumber: number
    } = {
        show: true,
        splitNumber: 0.5
    };
    splitLine: {
        show: boolean,
        lineStyle: {
            color: string,
            width: number,
            type: any
        }
    } = {
        show: true,
        lineStyle: {
            color: "#808080",
            width: 0.5,
            type: "solid"
        }
    };
    splitNumber: number = 20;
    nameTextStyle = {
        color: '#ffffff'
    };
    axisLine = {
        lineStyle: {
            color: '#eee'
        }
    };
    nameLocation: any = 'middle';
    nameGap: number = 35;
    minorSplitLine: {
        show: boolean,
        lineStyle: {
            color: string,
            width: number,
            type: string
        }
    } = {
        show: true,
        lineStyle: {
            color: "#ddd",
            width: 0.5,
            type: "solid"
        }
    };

    constructor(config: Partial<DefaultXAxisConfiguration> = {}) {
        // Override default values with provided configuration
        Object.assign(this, config);
    }
}
