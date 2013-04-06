CodeMirror.defineMode("yaml-base", function() {

  var cons = ['true', 'false', 'on', 'off', 'yes', 'no'];
  var keywordRegex = new RegExp("\\b(("+cons.join(")|(")+"))$", 'i');

  return {
    token: function(stream, state) {
      var ch = stream.peek();
      var esc = state.escaped;
      state.escaped = false;
      /* comments */
      if (ch == "#" && (stream.pos == 0 || /\s/.test(stream.string.charAt(stream.pos - 1)))) {
        stream.skipToEnd(); return "comment";
      }
      if (state.literal && stream.indentation() > state.keyCol) {
        stream.skipToEnd(); return "string";
      } else if (state.literal) { state.literal = false; }
      if (stream.sol()) {
        state.keyCol = 0;
        state.pair = false;
        state.pairStart = false;
        /* document start */
        if(stream.match(/---/)) { return "def"; }
        /* document end */
        if (stream.match(/\.\.\./)) { return "def"; }
        /* array list item */
        if (stream.match(/\s*-\s+/)) { return 'meta'; }
      }
      /* pairs (associative arrays) -> key */
      if (!state.pair && stream.match(/^\s*([a-z0-9\._-])+(?=\s*:)/i)) {
        state.pair = true;
        state.keyCol = stream.indentation();
        return "atom";
      }
      if (state.pair && stream.match(/^:\s*/)) { state.pairStart = true; return 'meta'; }

      /* inline pairs/lists */
      if (stream.match(/^(\{|\}|\[|\])/)) {
        if (ch == '{')
          state.inlinePairs++;
        else if (ch == '}')
          state.inlinePairs--;
        else if (ch == '[')
          state.inlineList++;
        else
          state.inlineList--;
        return 'meta';
      }

      /* list seperator */
      if (state.inlineList > 0 && !esc && ch == ',') {
        stream.next();
        return 'meta';
      }
      /* pairs seperator */
      if (state.inlinePairs > 0 && !esc && ch == ',') {
        state.keyCol = 0;
        state.pair = false;
        state.pairStart = false;
        stream.next();
        return 'meta';
      }

      /* start of value of a pair */
      if (state.pairStart) {
        /* block literals */
        if (stream.match(/^\s*(\||\>)\s*/)) { state.literal = true; return 'meta'; };
        /* references */
        if (stream.match(/^\s*(\&|\*)[a-z0-9\._-]+\b/i)) { return 'variable-2'; }
        /* numbers */
        if (state.inlinePairs == 0 && stream.match(/^\s*-?[0-9\.\,]+\s?$/)) { return 'number'; }
        if (state.inlinePairs > 0 && stream.match(/^\s*-?[0-9\.\,]+\s?(?=(,|}))/)) { return 'number'; }
        /* keywords */
        if (stream.match(keywordRegex)) { return 'keyword'; }
      }

      /* nothing found, continue */
      state.pairStart = false;
      state.escaped = (ch == '\\');
      stream.next();
      return null;
    },
    startState: function() {
      return {
        pair: false,
        pairStart: false,
        keyCol: 0,
        inlinePairs: 0,
        inlineList: 0,
        literal: false,
        escaped: false
      };
    }
  };
});

CodeMirror.defineMode('yaml', function (config, parserConfig) {

    var TAG_DOLLAR = 'meta';
    var TAG_BRACKET = 'bracket';
    var TAG = 'atom';

    var overlay = {
        startState: function () {
            return {tags: [], nob: 0};
        },

        token: function (stream, state) {

            if (stream.match('${')) {
                state.tags.push(TAG_DOLLAR);
                stream.backUp(1);
                return TAG_DOLLAR;
            }

            if (stream.match('{')) {
                var lhs = state.tags.pop();
                if (lhs == TAG_DOLLAR) {
                    state.tags.push(TAG_BRACKET);
                    state.nob++;
                    return TAG_BRACKET;
                } else {
                    state.tags.push(lhs, null);
                    return null;
                }
            }

            if (stream.match('}')) {
                var rhs = state.tags.pop();
                if (rhs == TAG_BRACKET) state.nob--;
                return rhs;
            }

            while (stream.next() != null) {
                if (stream.match('${', false)) break;
                if (stream.match('{', false)) break;
                if (stream.match('}', false)) break;
            }

            return (state.nob > 0) ? TAG : null;
        }
    };

    var mode = CodeMirror.getMode(
        config, parserConfig.backdrop || 'yaml-base'
    );

    return CodeMirror.overlayMode(mode, overlay);
}, 'yaml-base');

CodeMirror.defineMIME("text/x-yaml", "yaml");
