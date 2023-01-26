import { expect } from "chai";
import { newTimestamp } from "./dates";
import { Timestamp } from "./proto/google/protobuf/Timestamp";

const nowMillis = new Date('2023-01-01').getTime();
const nowSeconds = Math.round(nowMillis / 1000);

describe("newTimestamp", () => {

    beforeAll(() => {
        jest.useFakeTimers({ doNotFake: ["performance"] });
        jest.setSystemTime(new Date(nowMillis));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    const testCases: {
        [key: string]: {
            offset: number,
            want: Timestamp,
        }
    } = {
        "past": { offset: -60, want: { seconds: nowSeconds - 60 } },
        "now": { offset: 0, want: { seconds: nowSeconds } },
        "future": { offset: +60, want: { seconds: nowSeconds + 60 } },
    };

    for (const name in testCases) {
        const tc = testCases[name];
        it(name, () => {
            const got = newTimestamp(tc.offset);
            expect(got).to.deep.equal(tc.want);
        });
    }

});