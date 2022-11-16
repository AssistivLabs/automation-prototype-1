import WebSocket from "ws";

// These types were derived from this source of truth https://robotjs.io/docs/syntax#keys
// Selected the tbody with the Inspector in DevTools then ran this one-liner to generate the non-letters-or-digits union type
//     Array.from($0.children).map((tr) => tr.children[0].textContent).map(key => `'${key}'`).join(" | ")
// It's missing Caps Lock and the Windows Key
type NonLetterOrDigitKey =
  | "backspace"
  | "delete"
  | "enter"
  | "tab"
  | "escape"
  | "up"
  | "down"
  | "right"
  | "left"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12"
  | "command"
  | "alt"
  | "control"
  | "shift"
  | "right_shift"
  | "space"
  | "printscreen"
  | "insert"
  | "audio_mute"
  | "audio_vol_down"
  | "audio_vol_up"
  | "audio_play"
  | "audio_stop"
  | "audio_pause"
  | "audio_prev"
  | "audio_next"
  | "audio_rewind"
  | "audio_forward"
  | "audio_repeat"
  | "audio_random"
  | "numpad_0"
  | "numpad_1"
  | "numpad_2"
  | "numpad_3"
  | "numpad_4"
  | "numpad_5"
  | "numpad_6"
  | "numpad_7"
  | "numpad_8"
  | "numpad_9"
  | "lights_mon_up"
  | "lights_mon_down"
  | "lights_kbd_toggle"
  | "lights_kbd_up"
  | "lights_kbd_down";
// Need to figure out if robotjs can use other character sets too
type Char =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9";
// Likely not comprehensive, needs expansion
type Separator =
  | "`"
  | ","
  | "."
  | "/"
  | ";"
  | "'"
  | "["
  | "]"
  | "\\"
  | "-"
  | "=";
type Key = Char | Separator | NonLetterOrDigitKey;

function createAbstractions() {
  let ariaAtDriverWs: WebSocket | undefined;
  let speechStream: SpeechStream = new SpeechStream();

  /**
   * Pauses the "async thread" for a specified length of time
   * @param duration in milliseconds (e.g. 10000 would be 10 seconds)
   */
  async function sleep(duration: number) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }

  /**
   * Sets up a websocket connection to the remote at-driver agent
   * @param param0.wsUrl A URL to connect to the websocket with (should start with a scheme of "ws://")
   */
  async function connectToAriaAtDriverWebsocket({
    wsUrl,
  }: {
    wsUrl: string;
  }): Promise<void> {
    ariaAtDriverWs = new WebSocket(wsUrl, ["v1.aria-at.bocoup.com"]);

    ariaAtDriverWs.on("message", function message(data) {
      // Need to be wary of the untrusted input here (e.g. for things like prototype pollution)
      // Reading properties for comparison and serialization seems ok
      const messageObj = JSON.parse(data as unknown as string); // typeof data actually returns "object" but JSON.parse seems to handle it fine

      if (messageObj.type !== "event") {
        return;
      }

      if (messageObj.name !== "speech") {
        return;
      }

      speechStream.insert(messageObj.data);
    });

    speechStream.registerCallback((speech: string) => {
      console.info(`${new Date().toISOString()} [speech] ${speech}`);
    });

    return new Promise<void>((resolve) => {
      ariaAtDriverWs!.on("open", function open() {
        resolve();
      });
    });
  }

  /**
   * Wait for certain phrases to show up in the speech output before continuing (order of inputs doesn't matter)
   * @param phrasesToDetect The phrases to look for in the speech output
   * @returns a Promise, that rejects if it can't find all of the phrases within the timeout duration, or resolves otherwise
   */
  async function waitForSpeechToInclude(
    ...phrasesToDetect: string[]
  ): Promise<void> {
    const DEFAULT_TIMEOUT_IN_SECONDS = 60;
    let callbackId: string;

    return new Promise<void>((resolve, reject) => {
      const idOfSetTimeout = setTimeout(() => {
        reject(
          `Unable to detect ${phrasesToDetect} in speech within ${DEFAULT_TIMEOUT_IN_SECONDS} seconds`
        );
      }, DEFAULT_TIMEOUT_IN_SECONDS * 1000);

      const setOfPhrasesLeftToDetect = new Set(phrasesToDetect);

      callbackId = speechStream.registerCallback((speech: string) => {
        const setOfIdentifiedPhrases = new Set<string>();

        for (const phrase of setOfPhrasesLeftToDetect) {
          if (speech.includes(phrase)) {
            setOfIdentifiedPhrases.add(phrase);
          }
        }

        for (const identifiedPhrase of setOfIdentifiedPhrases) {
          setOfPhrasesLeftToDetect.delete(identifiedPhrase);
        }

        if (setOfPhrasesLeftToDetect.size === 0) {
          clearTimeout(idOfSetTimeout);

          // console.debug(`${phrasesToDetect} all found in speech`); //TODO - move this behind a flag of some form

          resolve();
        }
      });
    }).finally(() => {
      speechStream.unregisterCallback(callbackId);
    });
  }

  // This seems like a bad abstraction to me, hence the commenting out. Presumably the character-to-key-sequence mapping piece is a more usable abstraction
  // function typeSeveralCharactersInQuickSuccession(stringToType: string) {
  //   [...stringToType].forEach((character) => {
  //     if (character === "@") {
  //       pressKey("shift");
  //       pressKey("2");
  //       releaseKey("2");
  //       releaseKey("shift");

  //       return;
  //     }

  //     pressAndReleaseKey(character);
  //   });
  // }

  /**
   * Presses and immediately releases a keyboard key on the remote Windows machine
   * @param key if the TS type is missing an option, you can add "as Key" to it as a workaround
   */
  function pressAndReleaseKey(key: Key) {
    pressKey(key);
    releaseKey(key);
  }

  /**
   * Presses a keyboard key on the remote Windows machine
   * @param key if the TS type is missing an option, you can add "as Key" to it as a workaround
   */
  function pressKey(key: Key) {
    console.info(`${new Date().toISOString()} [keypress] ${key}`);

    ariaAtDriverWs!.send(
      JSON.stringify({
        type: "command",
        id: Math.floor(Math.random() * 1000000),
        name: "pressKey",
        params: [key],
      })
    );
  }

  /**
   * Releases a keyboard key on the remote Windows machine
   * @param key if the TS type is missing an option, you can add "as Key" to it as a workaround
   */
  function releaseKey(key: Key) {
    ariaAtDriverWs!.send(
      JSON.stringify({
        type: "command",
        id: Math.floor(Math.random() * 1000000),
        name: "releaseKey",
        params: [key],
      })
    );
  }

  return {
    sleep,
    connectToAriaAtDriverWebsocket,
    waitForSpeechToInclude,
    // typeSeveralCharactersInQuickSuccession,
    pressAndReleaseKey,
    pressKey,
    releaseKey,
  };
}

class SpeechStream {
  #speech: string[] = [];
  #insertionCallbacks: Map<string, (speech: string) => void> = new Map();

  insert(speech: string) {
    this.#speech.unshift(speech);

    for (const callback of this.#insertionCallbacks.values()) {
      try {
        callback(speech);
      } catch (error) {
        console.error(error);
      }
    }
  }

  registerCallback(callback: (speech: string) => void): string {
    const key = String(Date.now()); //TODO - replace with something better
    this.#insertionCallbacks.set(key, callback);

    return key;
  }

  unregisterCallback(key: string): void {
    this.#insertionCallbacks.delete(key);
  }
}

export { createAbstractions };
export type { Key };
