CodeMirror.defineMode('yaml-plus', function (config, parserConfig) {

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
        config, parserConfig.backdrop || 'text/x-yaml'
    );

    return CodeMirror.overlayMode(mode, overlay);
}, 'yaml');
