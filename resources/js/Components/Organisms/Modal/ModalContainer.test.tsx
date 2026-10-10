import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ModalProvider, useModal } from '@/context/ModalContext';
import { ModalContextType } from '@/types/Modal';
import { ModalContainer } from './ModalContainer';

const renderModalContainer = () => {
    let api!: ModalContextType;

    const Capture = () => {
        api = useModal();
        return null;
    };

    const utils = render(
        <ModalProvider>
            <Capture />
            <ModalContainer />
        </ModalProvider>,
    );

    return { ...utils, getApi: () => api };
};

describe('ModalContainer Component', () => {
    test('renders nothing when no modals are open', () => {
        renderModalContainer();

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('renders a modal opened via context with its title and content', () => {
        const { getApi } = renderModalContainer();

        act(() => {
            getApi().openModal(
                'My Modal',
                'Some description',
                <p>Hello world</p>,
            );
        });

        expect(screen.getByText('My Modal')).toBeInTheDocument();
        expect(screen.getByText('Some description')).toBeInTheDocument();
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    test('renders every modal currently open in context', () => {
        const { getApi } = renderModalContainer();

        act(() => {
            getApi().openModal('First Modal', undefined, <p>First body</p>);
            getApi().openModal('Second Modal', undefined, <p>Second body</p>);
        });

        expect(screen.getByText('First Modal')).toBeInTheDocument();
        expect(screen.getByText('Second Modal')).toBeInTheDocument();
    });

    test('removes a modal from the DOM once closeModal is called with its id', () => {
        const { getApi } = renderModalContainer();

        let id = '';
        act(() => {
            id = getApi().openModal('Closable Modal', undefined, <p>Body</p>);
        });
        expect(screen.getByText('Closable Modal')).toBeInTheDocument();

        act(() => {
            getApi().closeModal(id);
        });

        expect(screen.queryByText('Closable Modal')).not.toBeInTheDocument();
    });

    test('clicking the header close button closes the modal via context', async () => {
        const { getApi } = renderModalContainer();

        act(() => {
            getApi().openModal('Closable Modal', undefined, <p>Body</p>);
        });
        expect(screen.getByText('Closable Modal')).toBeInTheDocument();

        act(() => {
            screen.getByRole('button').click();
        });

        expect(screen.queryByText('Closable Modal')).not.toBeInTheDocument();
    });

    test('deduplicates modals that share the same id, rendering only the first', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
        const { getApi } = renderModalContainer();

        act(() => {
            getApi().openModal('First Modal', undefined, <p>First body</p>);
            getApi().openModal('Second Modal', undefined, <p>Second body</p>);
        });

        expect(screen.getByText('First Modal')).toBeInTheDocument();
        expect(screen.queryByText('Second Modal')).not.toBeInTheDocument();

        randomSpy.mockRestore();
    });
});
